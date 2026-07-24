import type { Customer, LoanApplication, Scheme } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { seededRandom, randomInRange } from "../lib/seededRandom.js";

type Weights = Record<string, number>;

const SECURED_WEIGHTS: Weights = {
  CIBIL_SCORE: 25,
  BEHAVIOUR: 10,
  TRANSACTIONAL: 10,
  BANK_STATEMENT: 15,
  REPAYMENT_HISTORY: 10,
  DEFAULT_HISTORY: 5,
  AGE_SUITABILITY: 10,
  EMPLOYER_CATEGORY: 10,
  CO_APPLICANT: 5,
};

const UNSECURED_WEIGHTS: Weights = {
  CIBIL_SCORE: 25,
  BEHAVIOUR: 10,
  TRANSACTIONAL: 10,
  BANK_STATEMENT: 10,
  REPAYMENT_HISTORY: 10,
  DEFAULT_HISTORY: 5,
  AGE_SUITABILITY: 5,
  EMPLOYER_CATEGORY: 20,
  CO_APPLICANT: 5,
};

export const COMPONENT_LABELS: Record<string, string> = {
  CIBIL_SCORE: "CIBIL score",
  BEHAVIOUR: "Behaviour analysis",
  TRANSACTIONAL: "Transactional analysis",
  BANK_STATEMENT: "Bank statement analysis",
  REPAYMENT_HISTORY: "Repayment history",
  DEFAULT_HISTORY: "Default history",
  AGE_SUITABILITY: "Applicant age suitability",
  EMPLOYER_CATEGORY: "Employer category",
  CO_APPLICANT: "Co-applicant profile",
};

function ageFromDob(dob: Date | null): number | null {
  if (!dob) return null;
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export async function ensureCibilScore(customer: Customer): Promise<number> {
  if (customer.cibilScore) return customer.cibilScore;
  const rand = seededRandom(`cibil:${customer.id}`);
  const score = randomInRange(rand, 640, 810);
  await prisma.customer.update({ where: { id: customer.id }, data: { cibilScore: score } });
  return score;
}

export async function runCreditAssessment(applicationId: string) {
  const application = await prisma.loanApplication.findUniqueOrThrow({
    where: { id: applicationId },
    include: { customer: true, scheme: true },
  });

  const cibil = await ensureCibilScore(application.customer);
  const weights = application.scheme.category === "SECURED" ? SECURED_WEIGHTS : UNSECURED_WEIGHTS;
  const rand = seededRandom(`score:${applicationId}`);

  const age = ageFromDob(application.customer.dob);
  const cibilComponentScore = clamp(Math.round(((cibil - 300) / (900 - 300)) * 100), 0, 100);

  const ageScore = age === null
    ? randomInRange(rand, 50, 80)
    : age >= 25 && age <= 55
      ? randomInRange(rand, 88, 100)
      : age >= 21 && age <= 58
        ? randomInRange(rand, 60, 78)
        : randomInRange(rand, 20, 40);

  const defaultScore = application.customer.hasActiveDefault
    ? randomInRange(rand, 10, 30)
    : randomInRange(rand, 82, 97);

  const netIncome = application.customer.netIncome ? Number(application.customer.netIncome) : null;
  const emi = application.emi ? Number(application.emi) : null;
  const dbr = netIncome && emi ? (emi / netIncome) * 100 : null;
  const bankStatementScore = dbr === null
    ? randomInRange(rand, 50, 75)
    : dbr <= 30
      ? randomInRange(rand, 85, 100)
      : dbr <= 50
        ? randomInRange(rand, 60, 82)
        : randomInRange(rand, 25, 50);

  const employer = (application.customer.employer ?? "").toLowerCase();
  const employerScore = /govt|government|psu|public sector/.test(employer)
    ? randomInRange(rand, 88, 100)
    : /self|proprietor|business/.test(employer)
      ? randomInRange(rand, 55, 78)
      : randomInRange(rand, 65, 90);

  const behaviourScore = randomInRange(rand, 55, 92);
  const transactionalScore = randomInRange(rand, 55, 92);
  const repaymentScore = randomInRange(rand, clamp(cibilComponentScore - 10, 40, 90), clamp(cibilComponentScore + 5, 50, 100));
  const coApplicantScore = randomInRange(rand, 45, 80);

  const componentScores: Record<string, number> = {
    CIBIL_SCORE: cibilComponentScore,
    BEHAVIOUR: behaviourScore,
    TRANSACTIONAL: transactionalScore,
    BANK_STATEMENT: bankStatementScore,
    REPAYMENT_HISTORY: repaymentScore,
    DEFAULT_HISTORY: defaultScore,
    AGE_SUITABILITY: ageScore,
    EMPLOYER_CATEGORY: employerScore,
    CO_APPLICANT: coApplicantScore,
  };

  const notes: Record<string, string> = {
    CIBIL_SCORE: cibil >= 750 ? "Top decile — very low default probability" : cibil >= 700 ? "Above policy minimum" : "Below policy minimum — approval needs exception",
    BANK_STATEMENT: dbr === null ? "Income data incomplete" : `DBR ${dbr.toFixed(1)}%`,
    DEFAULT_HISTORY: application.customer.hasActiveDefault ? "Active default on record" : "No default on record",
    AGE_SUITABILITY: age === null ? "DOB not verified" : `Applicant age ${age}`,
    EMPLOYER_CATEGORY: application.customer.employer ?? "Employer not captured",
  };

  const compositeScore = Math.round(
    Object.entries(weights).reduce((sum, [key, weight]) => sum + (componentScores[key] * weight) / 100, 0)
  );

  await prisma.creditScoreComponent.deleteMany({ where: { applicationId } });
  await prisma.creditScoreComponent.createMany({
    data: Object.entries(weights).map(([component, weightPercent]) => ({
      applicationId,
      component,
      weightPercent,
      score: componentScores[component],
      note: notes[component] ?? null,
    })),
  });

  const policyChecks = await runPolicyChecks(application);
  const allPoliciesPass = policyChecks.every((c) => c.passed);
  const autoRecommendation = compositeScore >= 65 && allPoliciesPass ? "APPROVE" : "REVIEW";

  await prisma.loanApplication.update({
    where: { id: applicationId },
    data: { compositeScore, autoRecommendation },
  });

  return { compositeScore, autoRecommendation, componentScores, policyChecks };
}

async function runPolicyChecks(
  application: LoanApplication & { customer: Customer; scheme: Scheme }
) {
  const age = ageFromDob(application.customer.dob);
  const checks: Array<{ name: string; passed: boolean; note: string }> = [];

  checks.push({
    name: "Age 21–58",
    passed: age !== null && age >= 21 && age <= 58,
    note: age === null ? "Date of birth not verified" : `Applicant age ${age}`,
  });

  const netIncome = application.customer.netIncome ? Number(application.customer.netIncome) : null;
  const emi = application.emi ? Number(application.emi) : null;
  const dbr = netIncome && emi ? (emi / netIncome) * 100 : null;
  checks.push({
    name: "DBR ≤ 50%",
    passed: dbr !== null && dbr <= 50,
    note: dbr === null ? "Monthly income not captured" : `Debt-burden ratio ${dbr.toFixed(1)}%`,
  });

  if (application.scheme.category === "SECURED" && application.scheme.ltvPercent) {
    const collateralValue = application.collateralValue ? Number(application.collateralValue) : null;
    const ltv = collateralValue ? (Number(application.requestedAmount) / collateralValue) * 100 : null;
    checks.push({
      name: `LTV ≤ ${Number(application.scheme.ltvPercent)}%`,
      passed: ltv !== null && ltv <= Number(application.scheme.ltvPercent),
      note: ltv === null ? "Collateral value not provided" : `LTV ${ltv.toFixed(1)}%`,
    });
  } else {
    checks.push({ name: "LTV ≤ 80%", passed: true, note: "Not applicable — unsecured" });
  }

  checks.push({
    name: "KYC valid",
    passed: !!application.customer.kycVerifiedAt,
    note: application.customer.kycVerifiedAt ? "PAN & Aadhaar verified" : "KYC incomplete",
  });

  checks.push({
    name: "No active default",
    passed: !application.customer.hasActiveDefault,
    note: application.customer.hasActiveDefault ? "Active default on record" : "Clean repayment record",
  });

  await prisma.policyCheck.deleteMany({ where: { applicationId: application.id } });
  await prisma.policyCheck.createMany({
    data: checks.map((c) => ({ applicationId: application.id, name: c.name, passed: c.passed, note: c.note })),
  });

  return checks;
}

export function scoreBand(score: number): { label: string; color: string; bg: string } {
  if (score >= 80) return { label: "Excellent · Low Risk", color: "#059669", bg: "#D1FAE5" };
  if (score >= 65) return { label: "Good · Moderate Risk", color: "#D97706", bg: "#FEF3C7" };
  if (score >= 50) return { label: "Fair · Elevated Risk", color: "#EA580C", bg: "#FFEDD5" };
  return { label: "Poor · High Risk", color: "#DC2626", bg: "#FEE2E2" };
}
