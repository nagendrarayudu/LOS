import { useState } from 'react'
import { apiRequest, ApiError } from '../../lib/api'
import { useCustomerAuth } from './CustomerAuthContext'
import { CURRENCY_BY_COUNTRY, formatMoney } from '../../lib/currency'

const cur = CURRENCY_BY_COUNTRY.IN

type Application = {
  id: string
  requestedAmount: string
  tenureMonths: number
  emi: string | null
  aprPercent: string | null
  processingFeeAmount: string | null
  totalInterest: string | null
  totalPayable: string | null
  netDisbursedAmount: string | null
  scheme: { name: string; interestRate: string; repaymentType: string }
}

type Props = {
  application: Application
  onBack: () => void
  onSubmitted: () => void
}

export function KfsStep({ application, onBack, onSubmitted }: Props) {
  const auth = useCustomerAuth()
  const [ackKfs, setAckKfs] = useState(false)
  const [ackTerms, setAckTerms] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      await apiRequest(`/customer/applications/${application.id}/submit`, {
        method: 'POST',
        token: auth.token,
        body: { acceptKfs: true, acceptTerms: true },
      })
      onSubmitted()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not submit application')
    } finally {
      setSubmitting(false)
    }
  }

  const rows: Array<[string, string]> = [
    ['Product', application.scheme.name],
    ['Loan amount', formatMoney(Number(application.requestedAmount), cur)],
    ['Tenure', `${application.tenureMonths} months`],
    ['Nominal interest rate', `${Number(application.scheme.interestRate).toFixed(2)}% p.a.`],
    ['APR (all-in cost)', `${application.aprPercent ?? '—'}%`],
    [application.scheme.repaymentType === 'BULLET' ? 'Amount due at maturity' : 'Monthly EMI', formatMoney(Number(application.emi ?? 0) || Number(application.totalPayable ?? 0), cur)],
    ['Processing fee (incl. GST)', formatMoney(Number(application.processingFeeAmount ?? 0), cur)],
    ['Net amount disbursed', formatMoney(Number(application.netDisbursedAmount ?? 0), cur)],
    ['Total interest payable', formatMoney(Number(application.totalInterest ?? 0), cur)],
    ['Total amount payable', formatMoney(Number(application.totalPayable ?? 0), cur)],
  ]

  return (
    <div>
      <button className="cp-back" onClick={onBack}>
        ← Back
      </button>
      <div className="cp-step-label">Step 3 of 3 · Key Fact Statement</div>
      <h1 className="cp-h1">Key Fact Statement</h1>
      <p className="cp-sub">As required under RBI Digital Lending Guidelines — review before accepting.</p>

      <table className="cp-kfs-table">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td>{k}</td>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="cp-demo-hint">
        You have a 3-day cooling-off period after sanction during which you may cancel the loan by repaying the
        principal and proportionate interest, without any foreclosure charge.
      </div>

      <div className="cp-demo-hint" style={{ background: '#fff', border: '1px solid var(--line)', color: 'var(--stone)' }}>
        <b style={{ color: 'var(--ink)' }}>Grievance Redressal:</b> K. Lakshmi Narayana, Grievance Redressal Officer ·
        grievance@sahyogbank.in · 1800-425-9090 · Mon–Sat 10 AM–6 PM. Unresolved complaints may be escalated to the
        RBI Ombudsman (cms.rbi.org.in / 14448).
      </div>

      <label className="cp-checkbox-row">
        <input type="checkbox" checked={ackKfs} onChange={(e) => setAckKfs(e.target.checked)} />
        I have read and understood this Key Fact Statement, including the APR and cooling-off period.
      </label>
      <label className="cp-checkbox-row">
        <input type="checkbox" checked={ackTerms} onChange={(e) => setAckTerms(e.target.checked)} />
        I accept the Loan Agreement and Terms &amp; Conditions, and consent to e-sign upon final sanction.
      </label>

      {error && <p className="cp-err">{error}</p>}
      <button className="cp-btn cp-btn-primary" disabled={!ackKfs || !ackTerms || submitting} onClick={submit}>
        {submitting ? 'Submitting…' : 'Accept & submit application to branch'}
      </button>
    </div>
  )
}
