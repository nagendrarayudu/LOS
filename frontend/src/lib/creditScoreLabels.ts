export const COMPONENT_LABELS: Record<string, string> = {
  CIBIL_SCORE: 'CIBIL score',
  BEHAVIOUR: 'Behaviour analysis',
  TRANSACTIONAL: 'Transactional analysis',
  BANK_STATEMENT: 'Bank statement analysis',
  REPAYMENT_HISTORY: 'Repayment history',
  DEFAULT_HISTORY: 'Default history',
  AGE_SUITABILITY: 'Applicant age suitability',
  EMPLOYER_CATEGORY: 'Employer category',
  CO_APPLICANT: 'Co-applicant profile',
}

export function scoreBand(score: number): { label: string; color: string; bg: string } {
  if (score >= 80) return { label: 'Excellent · Low Risk', color: '#059669', bg: '#D1FAE5' }
  if (score >= 65) return { label: 'Good · Moderate Risk', color: '#D97706', bg: '#FEF3C7' }
  if (score >= 50) return { label: 'Fair · Elevated Risk', color: '#EA580C', bg: '#FFEDD5' }
  return { label: 'Poor · High Risk', color: '#DC2626', bg: '#FEE2E2' }
}
