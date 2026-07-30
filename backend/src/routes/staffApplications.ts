import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireStaff } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { runCreditAssessment } from "../services/creditScore.js";
import { moveToReview, requestMoreDocs, recordSanctionDecision, sanctionedAmountFor } from "../services/sanctionWorkflow.js";
import { sanctionTierFor, sanctionTierLabel } from "../services/sanctionRouting.js";
import { simulatePennyDrop, generateUtr, generateNeftBatchFile } from "../services/disbursal.js";
import { getBankParameter } from "../lib/masters.js";

export const staffApplicationsRouter = Router();
staffApplicationsRouter.use(requireStaff());

// ── Dashboard KPIs ────────────────────────────────────────

staffApplicationsRouter.get(
  "/dashboard/kpis",
  asyncHandler(async (req, res) => {
    const tenantId = req.staff!.tenantId;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [applicationsToday, pendingReview, sanctionedThisWeek, disbursedThisMonth] = await Promise.all([
      prisma.loanApplication.count({ where: { tenantId, createdAt: { gte: startOfToday } } }),
      prisma.loanApplication.count({ where: { tenantId, status: { in: ["NEW_LEAD", "DOCS_PENDING", "MAKER_REVIEW", "COMMITTEE_REVIEW"] } } }),
      prisma.loanApplication.count({ where: { tenantId, status: "SANCTIONED", updatedAt: { gte: startOfWeek } } }),
      prisma.disbursal.aggregate({
        where: { application: { tenantId }, status: "COMPLETED", disbursedAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
    ]);

    res.json({
      applicationsToday,
      pendingReview,
      sanctionedThisWeek,
      disbursedThisMonth: Number(disbursedThisMonth._sum.amount ?? 0),
    });
  })
);

// ── List / filter pipeline ────────────────────────────────

staffApplicationsRouter.get(
  "/applications",
  asyncHandler(async (req, res) => {
    const { status, schemeKey, search } = req.query as Record<string, string | undefined>;
    const applications = await prisma.loanApplication.findMany({
      where: {
        tenantId: req.staff!.tenantId,
        status: status ? (status as never) : undefined,
        scheme: schemeKey ? { key: schemeKey } : undefined,
        customer: search
          ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { mobile: { contains: search } }] }
          : undefined,
      },
      include: { scheme: true, customer: true, assignedOfficer: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(applications);
  })
);

// ── Detail ─────────────────────────────────────────────────

staffApplicationsRouter.get(
  "/applications/:id",
  asyncHandler(async (req, res) => {
    const application = await prisma.loanApplication.findFirst({
      where: { id: req.params.id, tenantId: req.staff!.tenantId },
      include: {
        scheme: true,
        customer: true,
        assignedOfficer: true,
        documents: { include: { verifiedBy: true } },
        statusEvents: { orderBy: { createdAt: "asc" }, include: { actor: true } },
        scoreComponents: true,
        policyChecks: true,
        sanctionDecisions: { orderBy: { decidedAt: "asc" }, include: { decidedBy: true } },
        disbursal: true,
      },
    });
    if (!application) throw new HttpError(404, "Application not found");

    const bankParams = await getBankParameter(req.staff!.tenantId);
    const tier = sanctionTierFor(Number(application.requestedAmount), bankParams);
    const committeeDecisions = application.sanctionDecisions.filter((d) => d.level === "COMMITTEE");
    const approveCount = committeeDecisions.filter((d) => d.decision === "APPROVED").length;
    const rejectCount = committeeDecisions.filter((d) => d.decision === "REJECTED").length;

    res.json({
      ...application,
      sanctionTier: tier,
      sanctionTierLabel: sanctionTierLabel(tier),
      committeeVotes: { approveCount, rejectCount, quorum: bankParams.committeeQuorum, size: bankParams.committeeSize },
    });
  })
);

// ── Assignment ─────────────────────────────────────────────

const assignSchema = z.object({ officerId: z.string() });

staffApplicationsRouter.post(
  "/applications/:id/assign",
  requireStaff("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const { officerId } = assignSchema.parse(req.body);
    const officer = await prisma.staffUser.findFirst({ where: { id: officerId, tenantId: req.staff!.tenantId } });
    if (!officer) throw new HttpError(404, "Officer not found");
    const application = await prisma.loanApplication.update({
      where: { id: req.params.id },
      data: { assignedOfficerId: officerId },
    });
    res.json(application);
  })
);

// ── Review lifecycle ─────────────────────────────────────

staffApplicationsRouter.post(
  "/applications/:id/start-review",
  asyncHandler(async (req, res) => {
    await moveToReview(req.params.id, req.staff!.sub);
    res.json({ ok: true });
  })
);

const requestDocsSchema = z.object({ note: z.string().min(3) });

staffApplicationsRouter.post(
  "/applications/:id/request-docs",
  asyncHandler(async (req, res) => {
    const { note } = requestDocsSchema.parse(req.body);
    await requestMoreDocs(req.params.id, req.staff!.sub, note);
    res.json({ ok: true });
  })
);

// ── Credit assessment ────────────────────────────────────

staffApplicationsRouter.post(
  "/applications/:id/credit-score/recompute",
  asyncHandler(async (req, res) => {
    const result = await runCreditAssessment(req.params.id);
    res.json(result);
  })
);

// ── Document verification ────────────────────────────────

staffApplicationsRouter.post(
  "/applications/:id/documents/:docId/verify",
  asyncHandler(async (req, res) => {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.docId, applicationId: req.params.id },
    });
    if (!doc) throw new HttpError(404, "Document not found");
    const updated = await prisma.document.update({
      where: { id: doc.id },
      data: { verified: true, verifiedAt: new Date(), verifiedById: req.staff!.sub },
    });
    res.json(updated);
  })
);

// ── Sanction decisions ────────────────────────────────────

const sanctionDecisionSchema = z.object({
  level: z.enum(["MAKER", "CHECKER", "COMMITTEE"]),
  decision: z.enum(["RECOMMENDED", "APPROVED", "REJECTED", "RETURNED"]),
  remarks: z.string().optional(),
  sanctionedAmount: z.number().positive().optional(),
  sanctionedTenureMonths: z.number().int().positive().optional(),
  sanctionedRate: z.number().positive().optional(),
});

staffApplicationsRouter.post(
  "/applications/:id/sanction-decision",
  asyncHandler(async (req, res) => {
    const body = sanctionDecisionSchema.parse(req.body);
    const result = await recordSanctionDecision({
      applicationId: req.params.id,
      staffId: req.staff!.sub,
      staffRole: req.staff!.role,
      ...body,
    });
    res.json(result);
  })
);

// ── Disbursal ─────────────────────────────────────────────

const initiateDisbursalSchema = z.object({
  method: z.enum(["CBS", "NEFT"]),
  accountNumber: z.string().min(9).max(18),
  ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC"),
  beneficiaryName: z.string().min(2),
});

staffApplicationsRouter.post(
  "/applications/:id/disburse/initiate",
  requireStaff("DISBURSAL_OFFICER", "ADMIN"),
  asyncHandler(async (req, res) => {
    const application = await prisma.loanApplication.findFirst({
      where: { id: req.params.id, tenantId: req.staff!.tenantId },
      include: { disbursal: true },
    });
    if (!application) throw new HttpError(404, "Application not found");
    if (application.status !== "SANCTIONED") throw new HttpError(400, "Application is not sanctioned");
    if (application.disbursal) throw new HttpError(400, "Disbursal already initiated");

    const body = initiateDisbursalSchema.parse(req.body);
    const amount = await sanctionedAmountFor(application.id);
    const attempt = 1;
    const pennyDropOk = simulatePennyDrop(body.accountNumber, attempt);

    const disbursal = await prisma.disbursal.create({
      data: {
        applicationId: application.id,
        method: body.method,
        amount,
        accountNumber: body.accountNumber,
        ifsc: body.ifsc.toUpperCase(),
        beneficiaryName: body.beneficiaryName,
        pennyDropStatus: pennyDropOk ? "VERIFIED" : "FAILED",
        pennyDropAttempts: attempt,
        status: "PENDING",
      },
    });
    res.status(201).json(disbursal);
  })
);

staffApplicationsRouter.post(
  "/applications/:id/disburse/retry-penny-drop",
  requireStaff("DISBURSAL_OFFICER", "ADMIN"),
  asyncHandler(async (req, res) => {
    const disbursal = await prisma.disbursal.findFirst({ where: { applicationId: req.params.id } });
    if (!disbursal) throw new HttpError(404, "Disbursal not found");
    if (disbursal.status !== "PENDING") throw new HttpError(400, "Disbursal already finalized");
    const attempt = disbursal.pennyDropAttempts + 1;
    const ok = simulatePennyDrop(disbursal.accountNumber, attempt);
    const updated = await prisma.disbursal.update({
      where: { id: disbursal.id },
      data: { pennyDropStatus: ok ? "VERIFIED" : "FAILED", pennyDropAttempts: attempt },
    });
    res.json(updated);
  })
);

staffApplicationsRouter.post(
  "/applications/:id/disburse/confirm",
  requireStaff("DISBURSAL_OFFICER", "ADMIN"),
  asyncHandler(async (req, res) => {
    const application = await prisma.loanApplication.findFirst({
      where: { id: req.params.id, tenantId: req.staff!.tenantId },
      include: { disbursal: true },
    });
    if (!application) throw new HttpError(404, "Application not found");
    const disbursal = application.disbursal;
    if (!disbursal) throw new HttpError(400, "Disbursal not initiated");
    if (disbursal.pennyDropStatus !== "VERIFIED") throw new HttpError(400, "Penny-drop verification not completed");
    if (disbursal.status !== "PENDING") throw new HttpError(400, "Disbursal already finalized");

    const utrReference = generateUtr();
    const [updatedDisbursal] = await prisma.$transaction([
      prisma.disbursal.update({
        where: { id: disbursal.id },
        data: {
          status: "COMPLETED",
          utrReference,
          disbursedAt: new Date(),
          disbursedById: req.staff!.sub,
          neftFileGenerated: disbursal.method === "NEFT",
        },
      }),
      prisma.loanApplication.update({ where: { id: application.id }, data: { status: "DISBURSED" } }),
      prisma.applicationStatusEvent.create({
        data: { applicationId: application.id, status: "DISBURSED", actorId: req.staff!.sub, note: `Disbursed via ${disbursal.method}, UTR ${utrReference}` },
      }),
    ]);
    res.json(updatedDisbursal);
  })
);

staffApplicationsRouter.get(
  "/applications/:id/disburse/neft-file",
  requireStaff("DISBURSAL_OFFICER", "ADMIN"),
  asyncHandler(async (req, res) => {
    const application = await prisma.loanApplication.findFirst({
      where: { id: req.params.id, tenantId: req.staff!.tenantId },
      include: { disbursal: true },
    });
    if (!application?.disbursal || application.disbursal.method !== "NEFT") {
      throw new HttpError(404, "No NEFT disbursal found for this application");
    }
    const content = generateNeftBatchFile({
      beneficiaryName: application.disbursal.beneficiaryName,
      accountNumber: application.disbursal.accountNumber,
      ifsc: application.disbursal.ifsc,
      amount: Number(application.disbursal.amount),
      applicationNumber: application.applicationNumber,
      utrReference: application.disbursal.utrReference,
    });
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", `attachment; filename="neft-${application.applicationNumber}.txt"`);
    res.send(content);
  })
);

// ── Staff directory ───────────────────────────────────────

staffApplicationsRouter.get(
  "/users",
  asyncHandler(async (req, res) => {
    const users = await prisma.staffUser.findMany({
      where: { tenantId: req.staff!.tenantId, active: true },
      select: { id: true, name: true, email: true, role: true, branch: true, approvalLimit: true },
      orderBy: { name: "asc" },
    });
    res.json(users);
  })
);

staffApplicationsRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const me = await prisma.staffUser.findUniqueOrThrow({
      where: { id: req.staff!.sub },
      select: { id: true, name: true, email: true, role: true, branch: true, approvalLimit: true },
    });
    res.json(me);
  })
);
