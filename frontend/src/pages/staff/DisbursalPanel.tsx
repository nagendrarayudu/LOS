import { useState } from 'react'
import { apiRequest, ApiError } from '../../lib/api'
import { useStaffAuth } from './StaffAuthContext'
import { CURRENCY_BY_COUNTRY, formatMoney } from '../../lib/currency'

const cur = CURRENCY_BY_COUNTRY.IN

type Disbursal = {
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

type Props = {
  applicationId: string
  disbursal: Disbursal
  status: string
  onChanged: () => void
}

export function DisbursalPanel({ applicationId, disbursal, onChanged }: Props) {
  const auth = useStaffAuth()
  const [method, setMethod] = useState<'CBS' | 'NEFT'>('CBS')
  const [accountNumber, setAccountNumber] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [beneficiaryName, setBeneficiaryName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canOperate = auth.staff!.role === 'DISBURSAL_OFFICER' || auth.staff!.role === 'ADMIN'

  async function downloadNeftFile() {
    const res = await fetch(`/api/staff/applications/${applicationId}/disburse/neft-file`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    if (!res.ok) return setError('Could not download NEFT file')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `neft-${applicationId}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function run(fn: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      onChanged()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sp-card">
      <div className="sp-card-title">Disbursal</div>
      {error && <p className="cp-err">{error}</p>}

      {!disbursal && (
        <>
          {!canOperate && <p className="sp-sub">Only a disbursal officer can initiate disbursal.</p>}
          {canOperate && (
            <>
              <div className="sp-toolbar">
                <select className="sp-select" value={method} onChange={(e) => setMethod(e.target.value as 'CBS' | 'NEFT')}>
                  <option value="CBS">CBS · live</option>
                  <option value="NEFT">NEFT · file generation</option>
                </select>
              </div>
              <div className="cp-field">
                <label className="cp-label">Beneficiary name</label>
                <input className="cp-input" value={beneficiaryName} onChange={(e) => setBeneficiaryName(e.target.value)} />
              </div>
              <div className="cp-field">
                <label className="cp-label">Account number</label>
                <input className="cp-input" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))} />
              </div>
              <div className="cp-field">
                <label className="cp-label">IFSC</label>
                <input className="cp-input" value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())} placeholder="SBIN0001234" />
              </div>
              <button
                className="sp-btn sp-btn-primary"
                disabled={busy || !accountNumber || !ifsc || !beneficiaryName}
                onClick={() =>
                  run(() =>
                    apiRequest(`/staff/applications/${applicationId}/disburse/initiate`, {
                      method: 'POST',
                      token: auth.token,
                      body: { method, accountNumber, ifsc, beneficiaryName },
                    })
                  )
                }
              >
                Initiate disbursal
              </button>
            </>
          )}
        </>
      )}

      {disbursal && (
        <div className="sp-kv-grid">
          <div className="sp-kv">
            <div className="k">Method</div>
            <div className="v">{disbursal.method}</div>
          </div>
          <div className="sp-kv">
            <div className="k">Amount</div>
            <div className="v">{formatMoney(Number(disbursal.amount), cur)}</div>
          </div>
          <div className="sp-kv">
            <div className="k">Account</div>
            <div className="v">
              {disbursal.accountNumber} · {disbursal.ifsc}
            </div>
          </div>
          <div className="sp-kv">
            <div className="k">Penny-drop</div>
            <div className="v" style={{ color: disbursal.pennyDropStatus === 'VERIFIED' ? 'var(--sp-ok)' : 'var(--sp-fail)' }}>
              {disbursal.pennyDropStatus} ({disbursal.pennyDropAttempts} attempt{disbursal.pennyDropAttempts === 1 ? '' : 's'})
            </div>
          </div>
        </div>
      )}

      {disbursal && disbursal.status === 'PENDING' && canOperate && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {disbursal.pennyDropStatus !== 'VERIFIED' && (
            <button
              className="sp-btn sp-btn-outline"
              disabled={busy}
              onClick={() => run(() => apiRequest(`/staff/applications/${applicationId}/disburse/retry-penny-drop`, { method: 'POST', token: auth.token }))}
            >
              Retry penny-drop
            </button>
          )}
          <button
            className="sp-btn sp-btn-ok"
            disabled={busy || disbursal.pennyDropStatus !== 'VERIFIED'}
            onClick={() => run(() => apiRequest(`/staff/applications/${applicationId}/disburse/confirm`, { method: 'POST', token: auth.token }))}
          >
            Confirm & disburse
          </button>
        </div>
      )}

      {disbursal && disbursal.status === 'COMPLETED' && (
        <div style={{ marginTop: 14 }}>
          <p className="sp-sub">
            ✓ Disbursed · UTR <b>{disbursal.utrReference}</b>
          </p>
          {disbursal.neftFileGenerated && (
            <button className="sp-btn sp-btn-outline" onClick={downloadNeftFile}>
              Download NEFT batch file
            </button>
          )}
        </div>
      )}
    </div>
  )
}
