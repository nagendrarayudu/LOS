import { prisma } from "./prisma.js";

// Fallbacks mirror the values these masters replaced (previously hardcoded), so a tenant
// missing a config row (shouldn't happen post-seed) still behaves exactly as before.

export const DEFAULT_LOAN_PARAMETER = {
  processingFeePercent: 1,
  gstPercent: 18,
  penalInterestPercent: 24,
  foreclosurePercent: 2,
  bounceChargeAmount: 500,
  lateFeeAmount: 250,
  coolingOffDays: 3,
  moratoriumMonths: 0,
};

export const DEFAULT_BANK_PARAMETER = {
  bankName: "Sahyog Cooperative Bank",
  cbsCode: "SAHYOG01",
  ifscPrefix: "SHYG0",
  baseRatePercent: 8.5,
  singleApproverCeiling: 500000,
  makerCheckerCeiling: 2500000,
  committeeQuorum: 3,
  committeeSize: 5,
  neftCutoffTime: "16:30",
  workingDays: "Mon–Sat",
};

export const DEFAULT_LOAN_POLICY = {
  minAge: 21,
  maxAge: 58,
  maxDbrPercent: 50,
  defaultMaxLtvPercent: 80,
  minCibilScore: 650,
  minCompositeScoreAutoApprove: 65,
  requireKyc: true,
  blockActiveDefault: true,
};

export async function getLoanParameter(tenantId: string) {
  const row = await prisma.loanParameter.findUnique({ where: { tenantId } });
  return row
    ? { ...row, processingFeePercent: Number(row.processingFeePercent), gstPercent: Number(row.gstPercent), penalInterestPercent: Number(row.penalInterestPercent), foreclosurePercent: Number(row.foreclosurePercent), bounceChargeAmount: Number(row.bounceChargeAmount), lateFeeAmount: Number(row.lateFeeAmount) }
    : { tenantId, ...DEFAULT_LOAN_PARAMETER };
}

export async function getBankParameter(tenantId: string) {
  const row = await prisma.bankParameter.findUnique({ where: { tenantId } });
  return row
    ? { ...row, baseRatePercent: Number(row.baseRatePercent), singleApproverCeiling: Number(row.singleApproverCeiling), makerCheckerCeiling: Number(row.makerCheckerCeiling) }
    : { tenantId, ...DEFAULT_BANK_PARAMETER };
}

export async function getLoanPolicy(tenantId: string) {
  const row = await prisma.loanPolicy.findUnique({ where: { tenantId } });
  return row
    ? { ...row, maxDbrPercent: Number(row.maxDbrPercent), defaultMaxLtvPercent: Number(row.defaultMaxLtvPercent) }
    : { tenantId, ...DEFAULT_LOAN_POLICY };
}
