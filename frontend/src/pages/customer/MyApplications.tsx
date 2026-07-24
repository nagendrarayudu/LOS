import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../../lib/api'
import { useCustomerAuth } from './CustomerAuthContext'
import { CURRENCY_BY_COUNTRY, formatMoney } from '../../lib/currency'
import { STAGE_META } from '../../lib/stageMeta'

type Application = {
  id: string
  applicationNumber: string
  status: string
  requestedAmount: string
  createdAt: string
  scheme: { name: string }
}

export function MyApplications() {
  const auth = useCustomerAuth()
  const navigate = useNavigate()
  const [apps, setApps] = useState<Application[] | null>(null)

  useEffect(() => {
    apiRequest<Application[]>('/customer/applications', { token: auth.token }).then(setApps)
  }, [auth.token])

  const cur = CURRENCY_BY_COUNTRY.IN

  return (
    <div>
      <h1 className="cp-h1">My applications</h1>
      <p className="cp-sub">Track existing applications or start a new one.</p>

      <button className="cp-btn cp-btn-primary" style={{ marginBottom: 24 }} onClick={() => navigate('/apply/new')}>
        + New application
      </button>

      {apps === null && <p className="cp-sub">Loading…</p>}
      {apps?.length === 0 && <p className="cp-sub">You don&apos;t have any applications yet.</p>}
      {apps?.map((a) => {
        const meta = STAGE_META[a.status] ?? STAGE_META.NEW_LEAD
        return (
          <div
            key={a.id}
            className="cp-app-list-item"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/apply/app/${a.id}`)}
          >
            <div className="left">
              <div className="num">{a.applicationNumber.startsWith('DRAFT') ? 'Draft application' : a.applicationNumber}</div>
              <div className="meta">
                {a.scheme.name} · {formatMoney(Number(a.requestedAmount), cur)}
              </div>
            </div>
            <span className="cp-badge" style={{ color: meta.color, background: meta.bg }}>
              {meta.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
