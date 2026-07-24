import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiRequest, ApiError } from '../../lib/api'
import { useStaffAuth } from './StaffAuthContext'
import { CURRENCY_BY_COUNTRY, formatMoney } from '../../lib/currency'
import { COMPONENT_LABELS, scoreBand } from '../../lib/creditScoreLabels'
import { StageBadge } from './stageBadge'
import { DisbursalPanel } from './DisbursalPanel'

const cur = CURRENCY_BY_COUNTRY.IN

type Detail = {
  id: string
  applicationNumber: string
  status: string
  requestedAmount: string
  tenureMonths: number
  emi: string | null
  branch: string | null
  compositeScore: number | null
  autoRecommendation: string | null
  applicantType: string
  scheme: { name: string; interestRate: string; key: string }
  customer: {
    name: string | null
    mobile: string
    panNumber: string | null
    aadhaarLast4: string | null
    dob: string | null
    employer: string | null
    occupation: string | null
    netIncome: string | null
    cibilScore: number | null
  }
  assignedOfficer: { id: string; name: string } | null
  documents: Array<{ id: string; type: string; fileName: string; fileUrl: string; verified: boolean }>
  scoreComponents: Array<{ component: string; weightPercent: number; score: number; note: string | null }>
  policyChecks: Array<{ id: string; name: string; passed: boolean; note: string | null }>
  sanctionDecisions: Array<{ id: string; level: string; decision: string; remarks: string | null; decidedBy: { name: string }; decidedAt: string }>
  disbursal: {
    id: string
    method: string
    amount: string
    accountNumber: string
    ifsc: string
    pennyDropStatus: string
    pennyDropAttempts: number
    status: string
    utrReference: string | null
    neftFileGenerated: boolean
  } | null
  sanctionTier: 'SINGLE' | 'MAKER_CHECKER' | 'COMMITTEE'
  sanctionTierLabel: string
  committeeVotes: { approveCount: number; rejectCount: number; quorum: number; size: number }
}

type StaffOption = { id: string; name: string; role: string }

export function ApplicationDetail() {
  const { id } = useParams<{ id: string }>()
  const auth = useStaffAuth()
  const navigate = useNavigate()
  const [app, setApp] = useState<Detail | null>(null)
  const [officers, setOfficers] = useState<StaffOption[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remarks, setRemarks] = useState('')
  const [docsNote, setDocsNote] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    const detail = await apiRequest<Detail>(`/staff/applications/${id}`, { token: auth.token })
    setApp(detail)
  }, [id, auth.token])

  useEffect(() => {
    load()
    apiRequest<StaffOption[]>('/staff/users', { token: auth.token }).then(setOfficers)
  }, [load, auth.token])

  async function act(fn: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  if (!app) return <p className="sp-sub">Loading…</p>

  const band = app.compositeScore !== null ? scoreBand(app.compositeScore) : null
  const role = auth.staff!.role

  function decide(level: 'MAKER' | 'CHECKER' | 'COMMITTEE', decision: 'RECOMMENDED' | 'APPROVED' | 'REJECTED' | 'RETURNED') {
    return act(() =>
      apiRequest(`/staff/applications/${app!.id}/sanction-decision`, {
        method: 'POST',
        token: auth.token,
        body: { level, decision, remarks: remarks || undefined },
      })
    ).then(() => setRemarks(''))
  }

  return (
    <div>
      <button className="sp-back" onClick={() => navigate('/staff/applications')}>
        ← Pipeline
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <h1 className="sp-h1" style={{ marginBottom: 0 }}>
          {app.applicationNumber}
        </h1>
        <StageBadge status={app.status} />
      </div>
      <p className="sp-sub">
        {app.scheme.name} · {formatMoney(Number(app.requestedAmount), cur)} · {app.tenureMonths} months · {app.sanctionTierLabel}
      </p>

      <div className="sp-grid-2">
        <div>
          <div className="sp-card">
            <div className="sp-card-title">Applicant</div>
            <div className="sp-kv-grid">
              <div className="sp-kv">
                <div className="k">Name</div>
                <div className="v">{app.customer.name ?? '—'}</div>
              </div>
              <div className="sp-kv">
                <div className="k">Mobile</div>
                <div className="v">{app.customer.mobile}</div>
              </div>
              <div className="sp-kv">
                <div className="k">PAN</div>
                <div className="v">{app.customer.panNumber ?? '—'}</div>
              </div>
              <div className="sp-kv">
                <div className="k">Aadhaar</div>
                <div className="v">{app.customer.aadhaarLast4 ? `XXXX XXXX ${app.customer.aadhaarLast4}` : '—'}</div>
              </div>
              <div className="sp-kv">
                <div className="k">Employer</div>
                <div className="v">{app.customer.employer ?? '—'}</div>
              </div>
              <div className="sp-kv">
                <div className="k">Net income / mo</div>
                <div className="v">{app.customer.netIncome ? formatMoney(Number(app.customer.netIncome), cur) : '—'}</div>
              </div>
              <div className="sp-kv">
                <div className="k">Applicant type</div>
                <div className="v">{app.applicantType}</div>
              </div>
              <div className="sp-kv">
                <div className="k">Branch</div>
                <div className="v">{app.branch ?? '—'}</div>
              </div>
            </div>
          </div>

          <div className="sp-card">
            <div className="sp-card-title">Loan terms</div>
            <div className="sp-kv-grid">
              <div className="sp-kv">
                <div className="k">Amount</div>
                <div className="v">{formatMoney(Number(app.requestedAmount), cur)}</div>
              </div>
              <div className="sp-kv">
                <div className="k">Tenure</div>
                <div className="v">{app.tenureMonths} months</div>
              </div>
              <div className="sp-kv">
                <div className="k">Rate</div>
                <div className="v">{Number(app.scheme.interestRate).toFixed(2)}% p.a.</div>
              </div>
              <div className="sp-kv">
                <div className="k">EMI</div>
                <div className="v">{app.emi ? formatMoney(Number(app.emi), cur) : '—'}</div>
              </div>
            </div>
          </div>

          <div className="sp-card">
            <div className="sp-card-title">Documents</div>
            {app.documents.map((d) => (
              <div className="sp-doc-item" key={d.id}>
                <a href={d.fileUrl} target="_blank" rel="noreferrer">
                  {d.type.replaceAll('_', ' ')}
                </a>
                {d.verified ? (
                  <span style={{ color: 'var(--sp-ok)' }}>✓ Verified</span>
                ) : (
                  <button className="sp-btn sp-btn-outline" disabled={busy} onClick={() => act(() => apiRequest(`/staff/applications/${app.id}/documents/${d.id}/verify`, { method: 'POST', token: auth.token }))}>
                    Verify
                  </button>
                )}
              </div>
            ))}
            {app.documents.length === 0 && <p className="sp-sub">No documents uploaded.</p>}
          </div>

          <div className="sp-card">
            <div className="sp-card-title">Policy checks</div>
            {app.policyChecks.map((c) => (
              <div className="sp-policy-check" key={c.id}>
                <span>{c.name}</span>
                <span style={{ color: c.passed ? 'var(--sp-ok)' : 'var(--sp-fail)', fontWeight: 700 }}>
                  {c.passed ? '✓ Pass' : '✕ Fail'} {c.note ? `· ${c.note}` : ''}
                </span>
              </div>
            ))}
            {app.policyChecks.length === 0 && <p className="sp-sub">Not yet assessed.</p>}
          </div>

          {(app.status === 'SANCTIONED' || app.status === 'DISBURSED') && (
            <DisbursalPanel applicationId={app.id} disbursal={app.disbursal} status={app.status} onChanged={load} />
          )}

          <div className="sp-card">
            <div className="sp-card-title">Actions</div>

            {error && <p className="cp-err">{error}</p>}

            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <select
                className="sp-select"
                value={app.assignedOfficer?.id ?? ''}
                onChange={(e) => act(() => apiRequest(`/staff/applications/${app.id}/assign`, { method: 'POST', token: auth.token, body: { officerId: e.target.value } }))}
              >
                <option value="">Unassigned</option>
                {officers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.role})
                  </option>
                ))}
              </select>
            </div>

            {(app.status === 'NEW_LEAD' || app.status === 'DOCS_PENDING') && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="sp-btn sp-btn-primary" disabled={busy} onClick={() => act(() => apiRequest(`/staff/applications/${app.id}/start-review`, { method: 'POST', token: auth.token }))}>
                  Start review
                </button>
              </div>
            )}

            {app.status !== 'SANCTIONED' && app.status !== 'DISBURSED' && app.status !== 'REJECTED' && (
              <div style={{ marginTop: 12 }}>
                <textarea className="sp-textarea" placeholder="Note for the customer…" value={docsNote} onChange={(e) => setDocsNote(e.target.value)} />
                <button
                  className="sp-btn sp-btn-outline"
                  style={{ marginTop: 8 }}
                  disabled={busy || docsNote.length < 3}
                  onClick={() => act(() => apiRequest(`/staff/applications/${app.id}/request-docs`, { method: 'POST', token: auth.token, body: { note: docsNote } })).then(() => setDocsNote(''))}
                >
                  Request more documents
                </button>
              </div>
            )}

            {(app.status === 'MAKER_REVIEW' || app.status === 'COMMITTEE_REVIEW') && (
              <div style={{ marginTop: 16, borderTop: '1px solid var(--sp-line)', paddingTop: 16 }}>
                <p className="sp-sub" style={{ marginBottom: 8 }}>
                  Sanction decision · {app.sanctionTierLabel}
                </p>
                <textarea className="sp-textarea" placeholder="Remarks…" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {app.sanctionTier === 'SINGLE' && role === 'MANAGER' && app.status === 'MAKER_REVIEW' && (
                    <>
                      <button className="sp-btn sp-btn-ok" disabled={busy} onClick={() => decide('CHECKER', 'APPROVED')}>
                        Approve & sanction
                      </button>
                      <button className="sp-btn sp-btn-fail" disabled={busy} onClick={() => decide('CHECKER', 'REJECTED')}>
                        Reject
                      </button>
                    </>
                  )}
                  {app.sanctionTier === 'MAKER_CHECKER' && role === 'LOAN_OFFICER' && app.status === 'MAKER_REVIEW' && (
                    <>
                      <button className="sp-btn sp-btn-primary" disabled={busy} onClick={() => decide('MAKER', 'RECOMMENDED')}>
                        Recommend to checker
                      </button>
                      <button className="sp-btn sp-btn-fail" disabled={busy} onClick={() => decide('MAKER', 'REJECTED')}>
                        Reject
                      </button>
                    </>
                  )}
                  {app.sanctionTier === 'MAKER_CHECKER' && role === 'MANAGER' && app.status === 'MAKER_REVIEW' && (
                    <>
                      <button className="sp-btn sp-btn-ok" disabled={busy} onClick={() => decide('CHECKER', 'APPROVED')}>
                        Approve & sanction
                      </button>
                      <button className="sp-btn sp-btn-fail" disabled={busy} onClick={() => decide('CHECKER', 'REJECTED')}>
                        Reject
                      </button>
                      <button className="sp-btn sp-btn-outline" disabled={busy} onClick={() => decide('CHECKER', 'RETURNED')}>
                        Return for more info
                      </button>
                    </>
                  )}
                  {app.sanctionTier === 'COMMITTEE' && (role === 'LOAN_OFFICER' || role === 'MANAGER') && app.status === 'MAKER_REVIEW' && (
                    <button className="sp-btn sp-btn-primary" disabled={busy} onClick={() => decide('MAKER', 'RECOMMENDED')}>
                      Forward to credit committee
                    </button>
                  )}
                  {app.sanctionTier === 'COMMITTEE' && role === 'COMMITTEE_MEMBER' && app.status === 'COMMITTEE_REVIEW' && (
                    <>
                      <button className="sp-btn sp-btn-ok" disabled={busy} onClick={() => decide('COMMITTEE', 'APPROVED')}>
                        Vote approve
                      </button>
                      <button className="sp-btn sp-btn-fail" disabled={busy} onClick={() => decide('COMMITTEE', 'REJECTED')}>
                        Vote reject
                      </button>
                    </>
                  )}
                </div>
                {app.sanctionTier === 'COMMITTEE' && (
                  <p className="sp-sub" style={{ marginTop: 10 }}>
                    Committee votes: {app.committeeVotes.approveCount} approve / {app.committeeVotes.rejectCount} reject (quorum {app.committeeVotes.quorum} of {app.committeeVotes.size})
                  </p>
                )}
              </div>
            )}

            {app.sanctionDecisions.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <p className="sp-card-title">Decision log</p>
                {app.sanctionDecisions.map((d) => (
                  <div key={d.id} className="sp-committee-row">
                    <span>
                      {d.level} · {d.decidedBy.name}
                    </span>
                    <span style={{ fontWeight: 700 }}>{d.decision}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          {app.compositeScore !== null && band && (
            <div className="sp-score-panel">
              <div className="sp-score-num">{app.compositeScore}</div>
              <div className="sp-score-verdict">
                {band.label} · {app.autoRecommendation === 'APPROVE' ? 'auto-recommend approve' : 'checker review needed'}
              </div>
              <div className="sp-score-bars">
                {app.scoreComponents.map((c) => (
                  <div className="sp-score-bar-row" key={c.component}>
                    <div className="sp-score-bar-lbl">
                      <span>{COMPONENT_LABELS[c.component] ?? c.component}</span>
                      <span>{c.score}</span>
                    </div>
                    <div className="sp-score-bar-track">
                      <div className="sp-score-bar-fill" style={{ width: `${c.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="sp-btn sp-btn-outline"
                style={{ marginTop: 14, width: '100%', justifyContent: 'center' }}
                disabled={busy}
                onClick={() => act(() => apiRequest(`/staff/applications/${app.id}/credit-score/recompute`, { method: 'POST', token: auth.token }))}
              >
                Recompute score
              </button>
            </div>
          )}
          {app.compositeScore === null && (
            <div className="sp-card">
              <button
                className="sp-btn sp-btn-primary"
                disabled={busy}
                onClick={() => act(() => apiRequest(`/staff/applications/${app.id}/credit-score/recompute`, { method: 'POST', token: auth.token }))}
              >
                Run credit assessment
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
