import { prisma } from "../lib/prisma.js";
import { HttpError } from "../middleware/errorHandler.js";
import { sanctionTierFor, roleCanDecide, COMMITTEE_QUORUM, type SanctionTier } from "./sanctionRouting.js";
import type { SanctionDecisionType, SanctionLevel } from "@prisma/client";

export async function moveToReview(applicationId: string, actorId: string) {
  const application = await prisma.loanApplication.findUniqueOrThrow({ where: { id: applicationId } });
  if (application.status !== "NEW_LEAD" && application.status !== "DOCS_PENDING") {
    throw new HttpError(400, `Cannot start review from status ${application.status}`);
  }
  await prisma.$transaction([
    prisma.loanApplication.update({ where: { id: applicationId }, data: { status: "MAKER_REVIEW" } }),
    prisma.applicationStatusEvent.create({
      data: { applicationId, status: "MAKER_REVIEW", actorId, note: "Review started" },
    }),
  ]);
}

export async function requestMoreDocs(applicationId: string, actorId: string, note: string) {
  const application = await prisma.loanApplication.findUniqueOrThrow({ where: { id: applicationId } });
  if (application.status === "SANCTIONED" || application.status === "DISBURSED" || application.status === "REJECTED") {
    throw new HttpError(400, `Cannot request documents from status ${application.status}`);
  }
  await prisma.$transaction([
    prisma.loanApplication.update({ where: { id: applicationId }, data: { status: "DOCS_PENDING" } }),
    prisma.applicationStatusEvent.create({ data: { applicationId, status: "DOCS_PENDING", actorId, note } }),
  ]);
}

type DecisionInput = {
  applicationId: string;
  staffId: string;
  staffRole: string;
  level: SanctionLevel;
  decision: SanctionDecisionType;
  remarks?: string;
  sanctionedAmount?: number;
  sanctionedTenureMonths?: number;
  sanctionedRate?: number;
};

export async function recordSanctionDecision(input: DecisionInput) {
  const application = await prisma.loanApplication.findUniqueOrThrow({
    where: { id: input.applicationId },
    include: { sanctionDecisions: true },
  });

  if (application.status !== "MAKER_REVIEW" && application.status !== "COMMITTEE_REVIEW") {
    throw new HttpError(400, `Application is not awaiting a sanction decision (status ${application.status})`);
  }

  const tier: SanctionTier = sanctionTierFor(Number(application.requestedAmount));
  if (!roleCanDecide(tier, input.level, input.staffRole)) {
    throw new HttpError(403, `Role ${input.staffRole} cannot record a ${input.level} decision at this sanction tier (${tier})`);
  }

  await prisma.sanctionDecision.create({
    data: {
      applicationId: application.id,
      level: input.level,
      decidedById: input.staffId,
      decision: input.decision,
      remarks: input.remarks,
      sanctionedAmount: input.sanctionedAmount,
      sanctionedTenureMonths: input.sanctionedTenureMonths,
      sanctionedRate: input.sanctionedRate,
    },
  });

  if (input.decision === "REJECTED" && input.level !== "COMMITTEE") {
    await finalize(application.id, "REJECTED", input.staffId, input.remarks ?? "Rejected");
    return { status: "REJECTED" as const, tier };
  }

  if (input.decision === "RETURNED") {
    await finalize(application.id, "DOCS_PENDING", input.staffId, input.remarks ?? "Returned for more information");
    return { status: "DOCS_PENDING" as const, tier };
  }

  if (tier === "SINGLE") {
    if (input.level === "CHECKER" && input.decision === "APPROVED") {
      await finalize(application.id, "SANCTIONED", input.staffId, input.remarks ?? "Sanctioned by branch manager");
      return { status: "SANCTIONED" as const, tier };
    }
    return { status: application.status, tier };
  }

  if (tier === "MAKER_CHECKER") {
    if (input.level === "CHECKER" && input.decision === "APPROVED") {
      await finalize(application.id, "SANCTIONED", input.staffId, input.remarks ?? "Sanctioned by checker");
      return { status: "SANCTIONED" as const, tier };
    }
    return { status: application.status, tier };
  }

  // COMMITTEE tier
  if (input.level === "MAKER" && application.status === "MAKER_REVIEW") {
    await prisma.$transaction([
      prisma.loanApplication.update({ where: { id: application.id }, data: { status: "COMMITTEE_REVIEW" } }),
      prisma.applicationStatusEvent.create({
        data: { applicationId: application.id, status: "COMMITTEE_REVIEW", actorId: input.staffId, note: "Forwarded to credit committee" },
      }),
    ]);
    return { status: "COMMITTEE_REVIEW" as const, tier };
  }

  if (input.level === "COMMITTEE") {
    const decisions = await prisma.sanctionDecision.findMany({
      where: { applicationId: application.id, level: "COMMITTEE" },
    });
    const byMember = new Map<string, SanctionDecisionType>();
    for (const d of decisions) byMember.set(d.decidedById, d.decision);
    const approveCount = [...byMember.values()].filter((d) => d === "APPROVED").length;
    const rejectCount = [...byMember.values()].filter((d) => d === "REJECTED").length;

    if (approveCount >= COMMITTEE_QUORUM) {
      await finalize(application.id, "SANCTIONED", input.staffId, `Committee approved (${approveCount}/${COMMITTEE_QUORUM} quorum)`);
      return { status: "SANCTIONED" as const, tier, approveCount, rejectCount };
    }
    if (rejectCount >= COMMITTEE_QUORUM) {
      await finalize(application.id, "REJECTED", input.staffId, `Committee rejected (${rejectCount}/${COMMITTEE_QUORUM} quorum)`);
      return { status: "REJECTED" as const, tier, approveCount, rejectCount };
    }
    return { status: application.status, tier, approveCount, rejectCount };
  }

  return { status: application.status, tier };
}

async function finalize(applicationId: string, status: "SANCTIONED" | "REJECTED" | "DOCS_PENDING", actorId: string, note: string) {
  await prisma.$transaction([
    prisma.loanApplication.update({
      where: { id: applicationId },
      data: { status, rejectionReason: status === "REJECTED" ? note : undefined },
    }),
    prisma.applicationStatusEvent.create({ data: { applicationId, status, actorId, note } }),
  ]);
}

export async function sanctionedAmountFor(applicationId: string): Promise<number> {
  const application = await prisma.loanApplication.findUniqueOrThrow({
    where: { id: applicationId },
    include: { sanctionDecisions: { orderBy: { decidedAt: "desc" } } },
  });
  const withOverride = application.sanctionDecisions.find((d) => d.decision === "APPROVED" && d.sanctionedAmount);
  return withOverride?.sanctionedAmount ? Number(withOverride.sanctionedAmount) : Number(application.requestedAmount);
}
