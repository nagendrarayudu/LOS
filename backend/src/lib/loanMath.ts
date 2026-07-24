// Processing fee: 1% of loan amount + 18% GST on that fee, deducted upfront from disbursal.
export const PROCESSING_FEE_PCT = 1.18;
export const COOLING_OFF_DAYS = 3; // RBI Digital Lending Directions minimum look-up period

export type RepaymentType = "REDUCING" | "BULLET";

export type EmiResult = {
  emi: number;
  totalPayable: number;
  totalInterest: number;
};

/** Standard reducing-balance annuity EMI. */
export function calcEmi(principal: number, annualRatePct: number, tenureMonths: number): EmiResult {
  const r = annualRatePct / 100 / 12;
  const n = tenureMonths;
  const emi = r > 0
    ? Math.round((principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1))
    : Math.round(principal / n);
  const totalPayable = emi * n;
  const totalInterest = totalPayable - principal;
  return { emi, totalPayable, totalInterest };
}

/** Bullet repayment (used for gold loans): interest-only accrual, principal due at maturity. */
export function calcBullet(principal: number, annualRatePct: number, tenureMonths: number): EmiResult {
  const totalInterest = Math.round(principal * (annualRatePct / 100) * (tenureMonths / 12));
  return {
    emi: 0,
    totalPayable: principal + totalInterest,
    totalInterest,
  };
}

/**
 * All-in cost APR: solves for the discount rate that equates the EMI stream's
 * present value to the net amount actually disbursed (loan amount minus the
 * upfront processing fee), via 100 rounds of bisection.
 */
export function calcApr(annualRatePct: number, tenureMonths: number, feePct = PROCESSING_FEE_PCT): number {
  const P = 100000; // normalized base
  const n = Math.max(1, Math.round(tenureMonths) || 12);
  const rMonthly = annualRatePct / 12 / 100;
  const emi = rMonthly === 0 ? P / n : (P * rMonthly * Math.pow(1 + rMonthly, n)) / (Math.pow(1 + rMonthly, n) - 1);
  const netDisbursed = P * (1 - feePct / 100);

  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const pv = mid === 0 ? emi * n : (emi * (1 - Math.pow(1 + mid, -n))) / mid;
    if (pv > netDisbursed) lo = mid;
    else hi = mid;
  }
  return Math.round(((lo + hi) / 2) * 12 * 1000) / 10;
}

export function calcProcessingFee(principal: number, feePct = PROCESSING_FEE_PCT): number {
  return Math.round(principal * (feePct / 100));
}

export function repaymentSummary(
  principal: number,
  annualRatePct: number,
  tenureMonths: number,
  repaymentType: RepaymentType
) {
  const base = repaymentType === "BULLET" ? calcBullet(principal, annualRatePct, tenureMonths) : calcEmi(principal, annualRatePct, tenureMonths);
  const processingFeeAmount = calcProcessingFee(principal);
  const aprPercent = calcApr(annualRatePct, tenureMonths);
  const netDisbursedAmount = principal - processingFeeAmount;
  return { ...base, processingFeeAmount, aprPercent, netDisbursedAmount };
}
