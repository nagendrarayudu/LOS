import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../../lib/api'
import { useStaffAuth } from './StaffAuthContext'
import { CURRENCY_BY_COUNTRY, formatMoney } from '../../lib/currency'
import { StageBadge } from './stageBadge'

const cur = CURRENCY_BY_COUNTRY.IN

type Kpis = { applicationsToday: number; pendingReview: number; sanctionedThisWeek: number; disbursedThisMonth: number }
type AppRow = {
  id: string
  applicationNumber: string
  status: string
  requestedAmount: string
  compositeScore: number | null
  branch: string | null
  createdAt: string
  scheme: { name: string }
  customer: { name: string | null; mobile: string }
}

const STATUS_OPTIONS = ['', 'NEW_LEAD', 'DOCS_PENDING', 'MAKER_REVIEW', 'COMMITTEE_REVIEW', 'SANCTIONED', 'DISBURSED', 'REJECTED']

function ageLabel(createdAt: string) {
  const ms = Date.now() - new Date(createdAt).getTime()
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  if (days === 0) return 'Today'
  if (days === 1) return '1 day'
  return `${days} days`
}

export function Pipeline() {
  const auth = useStaffAuth()
  const navigate = useNavigate()
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [rows, setRows] = useState<AppRow[]>([])
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    apiRequest<Kpis>('/staff/dashboard/kpis', { token: auth.token }).then(setKpis)
  }, [auth.token])

  useEffect(() => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (search) params.set('search', search)
    apiRequest<AppRow[]>(`/staff/applications?${params.toString()}`, { token: auth.token }).then(setRows)
  }, [auth.token, status, search])

  return (
    <div>
      <h1 className="sp-h1">Pipeline</h1>
      <p className="sp-sub">Applications across every stage of the loan lifecycle.</p>

      {kpis && (
        <div className="sp-kpi-grid">
          <div className="sp-kpi-card">
            <div className="sp-kpi-lbl">Applications today</div>
            <div className="sp-kpi-val">{kpis.applicationsToday}</div>
          </div>
          <div className="sp-kpi-card">
            <div className="sp-kpi-lbl">Pending review</div>
            <div className="sp-kpi-val">{kpis.pendingReview}</div>
          </div>
          <div className="sp-kpi-card">
            <div className="sp-kpi-lbl">Sanctioned (week)</div>
            <div className="sp-kpi-val">{kpis.sanctionedThisWeek}</div>
          </div>
          <div className="sp-kpi-card">
            <div className="sp-kpi-lbl">Disbursed (month)</div>
            <div className="sp-kpi-val">{formatMoney(kpis.disbursedThisMonth, cur)}</div>
          </div>
        </div>
      )}

      <div className="sp-toolbar">
        <select className="sp-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All stages</option>
          {STATUS_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {s.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
        <input className="sp-input" placeholder="Search applicant or mobile" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <table className="sp-table">
        <thead>
          <tr>
            <th>Application</th>
            <th>Scheme</th>
            <th>Amount</th>
            <th>Score</th>
            <th>Stage</th>
            <th>Age</th>
            <th>Branch</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="clickable" onClick={() => navigate(`/staff/applications/${r.id}`)}>
              <td>
                <div style={{ fontWeight: 700 }}>{r.applicationNumber}</div>
                <div style={{ color: 'var(--sp-ink3)', fontSize: 12 }}>{r.customer.name ?? r.customer.mobile}</div>
              </td>
              <td>{r.scheme.name}</td>
              <td>{formatMoney(Number(r.requestedAmount), cur)}</td>
              <td>{r.compositeScore ?? '—'}</td>
              <td>
                <StageBadge status={r.status} />
              </td>
              <td>{ageLabel(r.createdAt)}</td>
              <td>{r.branch ?? '—'}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', color: 'var(--sp-ink3)', padding: 24 }}>
                No applications match this filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
