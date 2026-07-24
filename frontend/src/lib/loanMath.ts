export type RepaymentType = 'REDUCING' | 'BULLET'

export function calcEmi(principal: number, annualRatePct: number, tenureMonths: number) {
  const r = annualRatePct / 100 / 12
  const n = tenureMonths
  const emi = r > 0
    ? Math.round((principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1))
    : Math.round(principal / n)
  const totalPayable = emi * n
  const totalInterest = totalPayable - principal
  return { emi, totalPayable, totalInterest }
}

export function calcBullet(principal: number, annualRatePct: number, tenureMonths: number) {
  const totalInterest = Math.round(principal * (annualRatePct / 100) * (tenureMonths / 12))
  return { emi: 0, totalPayable: principal + totalInterest, totalInterest }
}

export function calcRepayment(principal: number, annualRatePct: number, tenureMonths: number, repaymentType: RepaymentType) {
  return repaymentType === 'BULLET' ? calcBullet(principal, annualRatePct, tenureMonths) : calcEmi(principal, annualRatePct, tenureMonths)
}
