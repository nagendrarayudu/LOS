import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiRequest } from '../../lib/api'
import { useCustomerAuth } from './CustomerAuthContext'
import { CURRENCY_BY_COUNTRY, formatMoney } from '../../lib/currency'
import { calcRepayment, type RepaymentType } from '../../lib/loanMath'

type Scheme = {
  id: string
  key: string
  name: string
  category: 'SECURED' | 'UNSECURED'
  repaymentType: RepaymentType
  interestRate: string
  minAmount: string
  maxAmount: string
  minTenureMonths: number
  maxTenureMonths: number
  tag: string | null
  description: string | null
}

const cur = CURRENCY_BY_COUNTRY.IN

export function NewApplication() {
  const auth = useCustomerAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [schemes, setSchemes] = useState<Scheme[]>([])
  const [schemeKey, setSchemeKey] = useState<string | null>(params.get('scheme'))
  const [amount, setAmount] = useState(100000)
  const [tenure, setTenure] = useState(24)
  const [applicantType, setApplicantType] = useState<'INDIVIDUAL' | 'ENTERPRISE'>('INDIVIDUAL')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiRequest<Scheme[]>('/schemes').then(setSchemes)
  }, [])

  const scheme = schemes.find((s) => s.key === schemeKey) ?? null

  useEffect(() => {
    if (scheme) {
      setAmount(Math.min(Math.max(amount, Number(scheme.minAmount)), Number(scheme.maxAmount)))
      setTenure(Math.min(Math.max(tenure, scheme.minTenureMonths), scheme.maxTenureMonths))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheme])

  const summary = useMemo(() => {
    if (!scheme) return null
    return calcRepayment(amount, Number(scheme.interestRate), tenure, scheme.repaymentType)
  }, [scheme, amount, tenure])

  async function createDraft() {
    if (!scheme) return
    setCreating(true)
    setError(null)
    try {
      const app = await apiRequest<{ id: string }>('/customer/applications', {
        method: 'POST',
        token: auth.token,
        body: { schemeKey: scheme.key, requestedAmount: amount, tenureMonths: tenure, applicantType },
      })
      navigate(`/apply/app/${app.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start application')
    } finally {
      setCreating(false)
    }
  }

  if (!scheme) {
    return (
      <div>
        <h1 className="cp-h1">Choose a loan scheme</h1>
        <p className="cp-sub">Pick the product that fits your need.</p>
        <div className="cp-scheme-grid">
          {schemes.map((s) => (
            <button key={s.id} className="cp-scheme-option" onClick={() => setSchemeKey(s.key)}>
              <div className="name">{s.name}</div>
              <div className="rate">{Number(s.interestRate).toFixed(2)}% p.a.</div>
              <div className="meta">
                upto {formatMoney(Number(s.maxAmount), cur)} · {s.tag}
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <button className="cp-back" onClick={() => setSchemeKey(null)}>
        ← Change scheme
      </button>
      <h1 className="cp-h1">{scheme.name}</h1>
      <p className="cp-sub">{scheme.description}</p>

      <div className="cp-field">
        <label className="cp-label">Applicant type</label>
        <select className="cp-select" value={applicantType} onChange={(e) => setApplicantType(e.target.value as 'INDIVIDUAL' | 'ENTERPRISE')}>
          <option value="INDIVIDUAL">Individual</option>
          <option value="ENTERPRISE">Business / Enterprise</option>
        </select>
      </div>

      <div className="cp-slider-row">
        <div className="top">
          <span>Loan amount</span>
          <b>{formatMoney(amount, cur)}</b>
        </div>
        <input
          className="cp-slider"
          type="range"
          min={Number(scheme.minAmount)}
          max={Number(scheme.maxAmount)}
          step={10000}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
      </div>

      <div className="cp-slider-row">
        <div className="top">
          <span>Tenure</span>
          <b>{tenure} months</b>
        </div>
        <input
          className="cp-slider"
          type="range"
          min={scheme.minTenureMonths}
          max={scheme.maxTenureMonths}
          step={1}
          value={tenure}
          onChange={(e) => setTenure(Number(e.target.value))}
        />
      </div>

      {summary && (
        <div className="cp-emi-summary">
          <div className="item">
            <div className="lbl">{scheme.repaymentType === 'BULLET' ? 'Amount due at maturity' : 'Monthly EMI'}</div>
            <div className="val">{formatMoney(scheme.repaymentType === 'BULLET' ? summary.totalPayable : summary.emi, cur)}</div>
          </div>
          <div className="item">
            <div className="lbl">Total interest</div>
            <div className="val">{formatMoney(summary.totalInterest, cur)}</div>
          </div>
          <div className="item">
            <div className="lbl">Total payable</div>
            <div className="val">{formatMoney(summary.totalPayable, cur)}</div>
          </div>
        </div>
      )}

      {error && <p className="cp-err">{error}</p>}
      <button className="cp-btn cp-btn-primary" disabled={creating} onClick={createDraft}>
        {creating ? 'Starting…' : `Continue with ${scheme.name}`}
      </button>
    </div>
  )
}
