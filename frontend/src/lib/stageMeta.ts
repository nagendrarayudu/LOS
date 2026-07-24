export const STAGE_META: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: { label: 'Draft', color: '#6B7280', bg: '#F3F4F6' },
  NEW_LEAD: { label: 'New — portal', color: '#10B981', bg: '#D1FAE5' },
  DOCS_PENDING: { label: 'Docs pending', color: '#6B7280', bg: '#F3F4F6' },
  MAKER_REVIEW: { label: 'Maker review', color: '#D97706', bg: '#FEF3C7' },
  COMMITTEE_REVIEW: { label: 'Committee', color: '#7C3AED', bg: '#EDE9FE' },
  SANCTIONED: { label: 'Sanctioned', color: '#0F8F5C', bg: '#D1FAE5' },
  DISBURSED: { label: 'Disbursed', color: '#0F8F5C', bg: '#D1FAE5' },
  REJECTED: { label: 'Rejected', color: '#DC2626', bg: '#FEE2E2' },
}

export const STAGE_ORDER = ['NEW_LEAD', 'DOCS_PENDING', 'MAKER_REVIEW', 'COMMITTEE_REVIEW', 'SANCTIONED', 'DISBURSED']
