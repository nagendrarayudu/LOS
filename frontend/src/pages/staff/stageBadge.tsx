import { STAGE_META } from '../../lib/stageMeta'

export function StageBadge({ status }: { status: string }) {
  const meta = STAGE_META[status] ?? STAGE_META.NEW_LEAD
  return (
    <span className="sp-badge" style={{ color: meta.color, background: meta.bg }}>
      {meta.label}
    </span>
  )
}
