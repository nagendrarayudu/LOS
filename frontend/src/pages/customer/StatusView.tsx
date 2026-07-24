import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../../lib/api'
import { useCustomerAuth } from './CustomerAuthContext'
import { STAGE_META, STAGE_ORDER } from '../../lib/stageMeta'
import { CURRENCY_BY_COUNTRY, formatMoney } from '../../lib/currency'

const cur = CURRENCY_BY_COUNTRY.IN

type Application = {
  id: string
  applicationNumber: string
  status: string
  requestedAmount: string
  submittedAt: string | null
  scheme: { name: string }
  statusEvents: Array<{ id: string; status: string; note: string | null; createdAt: string }>
}

const NEXT_STEPS: Record<string, string> = {
  NEW_LEAD: 'A loan officer will begin reviewing your application shortly.',
  DOCS_PENDING: 'We need a few more documents — please check what is pending below.',
  MAKER_REVIEW: 'Your income, KYC and credit profile are being assessed.',
  COMMITTEE_REVIEW: 'Your loan amount requires credit committee approval — this can take a little longer.',
  SANCTIONED: 'Your loan is sanctioned! Disbursal will follow once bank details are verified.',
  DISBURSED: 'Funds have been transferred to your account. Welcome to Sahyog!',
  REJECTED: 'Unfortunately this application was not approved. Contact your branch for details.',
}

export function StatusView({ applicationId }: { applicationId: string }) {
  const auth = useCustomerAuth()
  const navigate = useNavigate()
  const [app, setApp] = useState<Application | null>(null)

  useEffect(() => {
    apiRequest<Application>(`/customer/applications/${applicationId}`, { token: auth.token }).then(setApp)
  }, [applicationId, auth.token])

  if (!app) return <p className="cp-sub">Loading…</p>

  const currentIndex = STAGE_ORDER.indexOf(app.status)
  const rejected = app.status === 'REJECTED'

  return (
    <div>
      <button className="cp-back" onClick={() => navigate('/apply')}>
        ← My applications
      </button>
      <h1 className="cp-h1">{app.applicationNumber}</h1>
      <p className="cp-sub">
        {app.scheme.name} · {formatMoney(Number(app.requestedAmount), cur)}
        {app.submittedAt ? ` · submitted ${new Date(app.submittedAt).toLocaleDateString()}` : ''}
      </p>

      <span className="cp-badge" style={{ color: STAGE_META[app.status].color, background: STAGE_META[app.status].bg, marginBottom: 20 }}>
        {STAGE_META[app.status].label}
      </span>

      <div className="cp-demo-hint" style={{ marginTop: 16 }}>
        {NEXT_STEPS[app.status]}
      </div>

      {!rejected && (
        <div className="cp-timeline">
          {STAGE_ORDER.map((stage, i) => {
            const done = i < currentIndex || (i === currentIndex && app.status === 'DISBURSED')
            const active = i === currentIndex && app.status !== 'DISBURSED'
            const meta = STAGE_META[stage]
            return (
              <div className="cp-timeline-item" key={stage}>
                <div className={`cp-timeline-dot ${done ? 'done' : active ? 'active' : ''}`}>
                  {done && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="cp-timeline-title">{meta.label}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="cp-sub" style={{ marginTop: 24, marginBottom: 8, fontWeight: 700, color: 'var(--ink)' }}>
        Activity
      </p>
      {app.statusEvents.map((e) => (
        <div key={e.id} className="cp-timeline-item" style={{ paddingBottom: 14 }}>
          <div className="cp-timeline-dot done" style={{ width: 8, height: 8, marginTop: 6 }} />
          <div>
            <div className="cp-timeline-desc">{new Date(e.createdAt).toLocaleString()}</div>
            <div className="cp-timeline-title" style={{ fontSize: 12.5 }}>
              {e.note ?? STAGE_META[e.status]?.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
