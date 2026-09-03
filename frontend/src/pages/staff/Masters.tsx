import { useEffect, useState } from 'react'
import { apiRequest, ApiError } from '../../lib/api'
import { useStaffAuth } from './StaffAuthContext'
import { CURRENCY_BY_COUNTRY, formatMoney } from '../../lib/currency'

const cur = CURRENCY_BY_COUNTRY.IN

type Tab = 'products' | 'loanparams' | 'bankparams' | 'policy' | 'coa'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'products', label: 'Products & schemes' },
  { id: 'loanparams', label: 'Loan parameters' },
  { id: 'bankparams', label: 'Bank parameters' },
  { id: 'policy', label: 'Loan policy' },
  { id: 'coa', label: 'Chart of accounts' },
]

export function Masters() {
  const auth = useStaffAuth()
  const isAdmin = auth.staff?.role === 'ADMIN'
  const [tab, setTab] = useState<Tab>('products')

  return (
    <div>
      <h1 className="sp-h1">Masters</h1>
      <p className="sp-sub">
        Bank-wide configuration — products, loan parameters, bank parameters and loan policy. These drive the actual
        EMI/APR calculation, sanction routing and eligibility checks used across the app.
        {!isAdmin && ' You have read-only access; only Admin can edit.'}
      </p>

      <div className="sp-tabs">
        {TABS.map((t) => (
          <div key={t.id} className={`sp-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </div>
        ))}
      </div>

      {tab === 'products' && <ProductsPanel isAdmin={isAdmin} />}
      {tab === 'loanparams' && <LoanParametersPanel isAdmin={isAdmin} />}
      {tab === 'bankparams' && <BankParametersPanel isAdmin={isAdmin} />}
      {tab === 'policy' && <LoanPolicyPanel isAdmin={isAdmin} />}
      {tab === 'coa' && <GLAccountsPanel />}
    </div>
  )
}

// ── Products (schemes) ───────────────────────────────────

type Scheme = {
  id: string
  key: string
  name: string
  category: 'SECURED' | 'UNSECURED'
  repaymentType: 'REDUCING' | 'BULLET'
  interestRate: string
  minAmount: string
  maxAmount: string
  minTenureMonths: number
  maxTenureMonths: number
  ltvPercent: string | null
  tag: string | null
  description: string | null
  active: boolean
}

type SchemeForm = {
  key: string
  name: string
  category: 'SECURED' | 'UNSECURED'
  repaymentType: 'REDUCING' | 'BULLET'
  interestRate: string
  minAmount: string
  maxAmount: string
  minTenureMonths: string
  maxTenureMonths: string
  ltvPercent: string
  tag: string
  description: string
  active: boolean
}

const BLANK_SCHEME_FORM: SchemeForm = {
  key: '',
  name: '',
  category: 'UNSECURED',
  repaymentType: 'REDUCING',
  interestRate: '',
  minAmount: '',
  maxAmount: '',
  minTenureMonths: '',
  maxTenureMonths: '',
  ltvPercent: '',
  tag: '',
  description: '',
  active: true,
}

function schemeToForm(s: Scheme): SchemeForm {
  return {
    key: s.key,
    name: s.name,
    category: s.category,
    repaymentType: s.repaymentType,
    interestRate: s.interestRate,
    minAmount: s.minAmount,
    maxAmount: s.maxAmount,
    minTenureMonths: String(s.minTenureMonths),
    maxTenureMonths: String(s.maxTenureMonths),
    ltvPercent: s.ltvPercent ?? '',
    tag: s.tag ?? '',
    description: s.description ?? '',
    active: s.active,
  }
}

function ProductsPanel({ isAdmin }: { isAdmin: boolean }) {
  const auth = useStaffAuth()
  const [rows, setRows] = useState<Scheme[]>([])
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<SchemeForm>(BLANK_SCHEME_FORM)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function load() {
    apiRequest<Scheme[]>('/staff/masters/products', { token: auth.token }).then(setRows)
  }

  useEffect(load, [auth.token])

  function startEdit(s: Scheme) {
    setEditingId(s.id)
    setForm(schemeToForm(s))
    setError(null)
  }

  function startNew() {
    setEditingId('new')
    setForm(BLANK_SCHEME_FORM)
    setError(null)
  }

  async function save() {
    setError(null)
    setSaving(true)
    try {
      const body = {
        key: form.key,
        name: form.name,
        category: form.category,
        repaymentType: form.repaymentType,
        interestRate: Number(form.interestRate),
        minAmount: Number(form.minAmount),
        maxAmount: Number(form.maxAmount),
        minTenureMonths: Number(form.minTenureMonths),
        maxTenureMonths: Number(form.maxTenureMonths),
        ltvPercent: form.ltvPercent ? Number(form.ltvPercent) : null,
        tag: form.tag || null,
        description: form.description || null,
        active: form.active,
      }
      if (editingId === 'new') {
        await apiRequest('/staff/masters/products', { method: 'POST', token: auth.token, body })
      } else if (editingId) {
        await apiRequest(`/staff/masters/products/${editingId}`, { method: 'PUT', token: auth.token, body })
      }
      setEditingId(null)
      load()
    } catch (e) {
      setError(e instanceof ApiError ? JSON.stringify(e.details ?? e.message) : 'Could not save product')
    } finally {
      setSaving(false)
    }
  }

  async function deactivate(id: string) {
    await apiRequest(`/staff/masters/products/${id}`, { method: 'DELETE', token: auth.token })
    load()
  }

  return (
    <div className="sp-grid-2">
      <div>
        <table className="sp-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Rate</th>
              <th>Amount range</th>
              <th>Tenure (mo.)</th>
              <th>Status</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className={isAdmin ? 'clickable' : ''} onClick={() => isAdmin && startEdit(s)}>
                <td>
                  <strong>{s.name}</strong>
                  <div style={{ fontSize: 11, color: 'var(--sp-ink3)' }}>{s.key}</div>
                </td>
                <td>{s.category === 'SECURED' ? `Secured${s.ltvPercent ? ` · LTV ${s.ltvPercent}%` : ''}` : 'Unsecured'}</td>
                <td>{Number(s.interestRate).toFixed(2)}%</td>
                <td>
                  {formatMoney(Number(s.minAmount), cur)}–{formatMoney(Number(s.maxAmount), cur)}
                </td>
                <td>{s.minTenureMonths}–{s.maxTenureMonths}</td>
                <td>
                  <span className="sp-badge" style={{ background: s.active ? '#D1FAE5' : '#FEE2E2', color: s.active ? 'var(--sp-ok)' : 'var(--sp-fail)' }}>
                    {s.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {isAdmin && (
                  <td>
                    {s.active && (
                      <button
                        className="sp-btn sp-btn-outline"
                        style={{ height: 28, padding: '0 10px' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          deactivate(s.id)
                        }}
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {isAdmin && (
          <button className="sp-btn sp-btn-primary" style={{ marginTop: 14 }} onClick={startNew}>
            + Add product
          </button>
        )}
      </div>

      {isAdmin && editingId && (
        <div className="sp-card">
          <div className="sp-card-title">{editingId === 'new' ? 'New product' : 'Edit product'}</div>
          <div className="sp-form-grid">
            <div className="sp-field">
              <label>Key (unique)</label>
              <input className="sp-input" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })} disabled={editingId !== 'new'} />
            </div>
            <div className="sp-field">
              <label>Name</label>
              <input className="sp-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="sp-field">
              <label>Category</label>
              <select className="sp-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as SchemeForm['category'] })}>
                <option value="SECURED">Secured</option>
                <option value="UNSECURED">Unsecured</option>
              </select>
            </div>
            <div className="sp-field">
              <label>Repayment type</label>
              <select className="sp-select" value={form.repaymentType} onChange={(e) => setForm({ ...form, repaymentType: e.target.value as SchemeForm['repaymentType'] })}>
                <option value="REDUCING">Reducing balance (EMI)</option>
                <option value="BULLET">Bullet (interest-only)</option>
              </select>
            </div>
            <div className="sp-field">
              <label>Interest rate (% p.a.)</label>
              <input className="sp-input" type="number" step="0.01" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} />
            </div>
            <div className="sp-field">
              <label>LTV % (secured only, optional)</label>
              <input className="sp-input" type="number" step="0.01" value={form.ltvPercent} onChange={(e) => setForm({ ...form, ltvPercent: e.target.value })} />
            </div>
            <div className="sp-field">
              <label>Min amount (₹)</label>
              <input className="sp-input" type="number" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })} />
            </div>
            <div className="sp-field">
              <label>Max amount (₹)</label>
              <input className="sp-input" type="number" value={form.maxAmount} onChange={(e) => setForm({ ...form, maxAmount: e.target.value })} />
            </div>
            <div className="sp-field">
              <label>Min tenure (months)</label>
              <input className="sp-input" type="number" value={form.minTenureMonths} onChange={(e) => setForm({ ...form, minTenureMonths: e.target.value })} />
            </div>
            <div className="sp-field">
              <label>Max tenure (months)</label>
              <input className="sp-input" type="number" value={form.maxTenureMonths} onChange={(e) => setForm({ ...form, maxTenureMonths: e.target.value })} />
            </div>
            <div className="sp-field">
              <label>Tag</label>
              <input className="sp-input" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="e.g. Lowest rate" />
            </div>
            <div className="sp-field" style={{ gridColumn: '1 / -1' }}>
              <label>Description</label>
              <textarea className="sp-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          {error && <p className="cp-err">{error}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="sp-btn sp-btn-primary" disabled={saving} onClick={save}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button className="sp-btn sp-btn-outline" onClick={() => setEditingId(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Loan parameters ──────────────────────────────────────

type LoanParameter = {
  processingFeePercent: number
  gstPercent: number
  penalInterestPercent: number
  foreclosurePercent: number
  bounceChargeAmount: number
  lateFeeAmount: number
  coolingOffDays: number
  moratoriumMonths: number
}

function LoanParametersPanel({ isAdmin }: { isAdmin: boolean }) {
  const auth = useStaffAuth()
  const [data, setData] = useState<LoanParameter | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiRequest<LoanParameter>('/staff/masters/loan-parameters', { token: auth.token }).then(setData)
  }, [auth.token])

  async function save() {
    if (!data) return
    setError(null)
    setSaving(true)
    setSaved(false)
    try {
      const updated = await apiRequest<LoanParameter>('/staff/masters/loan-parameters', { method: 'PUT', token: auth.token, body: data })
      setData(updated)
      setSaved(true)
    } catch (e) {
      setError(e instanceof ApiError ? JSON.stringify(e.details ?? e.message) : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  if (!data) return null

  const field = (label: string, key: keyof LoanParameter, suffix = '') => (
    <div className="sp-field">
      <label>{label}</label>
      <input
        className="sp-input"
        type="number"
        step="0.01"
        value={data[key]}
        disabled={!isAdmin}
        onChange={(e) => setData({ ...data, [key]: Number(e.target.value) })}
      />
      {suffix && <span style={{ fontSize: 11, color: 'var(--sp-ink3)' }}>{suffix}</span>}
    </div>
  )

  return (
    <div className="sp-card" style={{ maxWidth: 720 }}>
      <div className="sp-card-title">Loan parameters</div>
      <p className="sp-sub" style={{ marginBottom: 16 }}>
        Feeds directly into EMI/APR/processing-fee calculation for every new or edited application.
      </p>
      <div className="sp-form-grid">
        {field('Processing fee (%, before GST)', 'processingFeePercent')}
        {field('GST on processing fee (%)', 'gstPercent')}
        {field('Penal interest (% p.a., on overdue EMI)', 'penalInterestPercent')}
        {field('Foreclosure charge (% of outstanding)', 'foreclosurePercent')}
        {field('Cheque/mandate bounce charge (₹)', 'bounceChargeAmount')}
        {field('Late payment fee (₹)', 'lateFeeAmount')}
        {field('Cooling-off period (days)', 'coolingOffDays')}
        {field('Moratorium (months)', 'moratoriumMonths')}
      </div>
      {error && <p className="cp-err">{error}</p>}
      {isAdmin && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <button className="sp-btn sp-btn-primary" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {saved && <span style={{ fontSize: 12, color: 'var(--sp-ok)' }}>Saved</span>}
        </div>
      )}
    </div>
  )
}

// ── Bank parameters ───────────────────────────────────────

type BankParameter = {
  bankName: string
  cbsCode: string
  ifscPrefix: string
  baseRatePercent: number
  singleApproverCeiling: number
  makerCheckerCeiling: number
  committeeQuorum: number
  committeeSize: number
  neftCutoffTime: string
  workingDays: string
}

function BankParametersPanel({ isAdmin }: { isAdmin: boolean }) {
  const auth = useStaffAuth()
  const [data, setData] = useState<BankParameter | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiRequest<BankParameter>('/staff/masters/bank-parameters', { token: auth.token }).then(setData)
  }, [auth.token])

  async function save() {
    if (!data) return
    setError(null)
    setSaving(true)
    setSaved(false)
    try {
      const updated = await apiRequest<BankParameter>('/staff/masters/bank-parameters', { method: 'PUT', token: auth.token, body: data })
      setData(updated)
      setSaved(true)
    } catch (e) {
      setError(e instanceof ApiError ? JSON.stringify(e.details ?? e.message) : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  if (!data) return null

  return (
    <div className="sp-card" style={{ maxWidth: 720 }}>
      <div className="sp-card-title">Bank parameters</div>
      <p className="sp-sub" style={{ marginBottom: 16 }}>
        Bank identity, base rate and sanction-routing ceilings — determines whether an application needs a single
        approver, maker-checker, or full credit committee sign-off.
      </p>
      <div className="sp-form-grid">
        <div className="sp-field">
          <label>Bank name</label>
          <input className="sp-input" value={data.bankName} disabled={!isAdmin} onChange={(e) => setData({ ...data, bankName: e.target.value })} />
        </div>
        <div className="sp-field">
          <label>CBS code</label>
          <input className="sp-input" value={data.cbsCode} disabled={!isAdmin} onChange={(e) => setData({ ...data, cbsCode: e.target.value })} />
        </div>
        <div className="sp-field">
          <label>IFSC prefix</label>
          <input className="sp-input" value={data.ifscPrefix} disabled={!isAdmin} onChange={(e) => setData({ ...data, ifscPrefix: e.target.value })} />
        </div>
        <div className="sp-field">
          <label>Base rate (% p.a.)</label>
          <input className="sp-input" type="number" step="0.01" value={data.baseRatePercent} disabled={!isAdmin} onChange={(e) => setData({ ...data, baseRatePercent: Number(e.target.value) })} />
        </div>
        <div className="sp-field">
          <label>Single-approver ceiling (₹, below this)</label>
          <input className="sp-input" type="number" value={data.singleApproverCeiling} disabled={!isAdmin} onChange={(e) => setData({ ...data, singleApproverCeiling: Number(e.target.value) })} />
        </div>
        <div className="sp-field">
          <label>Maker-checker ceiling (₹, below this; committee above)</label>
          <input className="sp-input" type="number" value={data.makerCheckerCeiling} disabled={!isAdmin} onChange={(e) => setData({ ...data, makerCheckerCeiling: Number(e.target.value) })} />
        </div>
        <div className="sp-field">
          <label>Committee quorum</label>
          <input className="sp-input" type="number" value={data.committeeQuorum} disabled={!isAdmin} onChange={(e) => setData({ ...data, committeeQuorum: Number(e.target.value) })} />
        </div>
        <div className="sp-field">
          <label>Committee size</label>
          <input className="sp-input" type="number" value={data.committeeSize} disabled={!isAdmin} onChange={(e) => setData({ ...data, committeeSize: Number(e.target.value) })} />
        </div>
        <div className="sp-field">
          <label>NEFT cut-off time</label>
          <input className="sp-input" value={data.neftCutoffTime} disabled={!isAdmin} onChange={(e) => setData({ ...data, neftCutoffTime: e.target.value })} />
        </div>
        <div className="sp-field">
          <label>Working days</label>
          <input className="sp-input" value={data.workingDays} disabled={!isAdmin} onChange={(e) => setData({ ...data, workingDays: e.target.value })} />
        </div>
      </div>
      {error && <p className="cp-err">{error}</p>}
      {isAdmin && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <button className="sp-btn sp-btn-primary" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {saved && <span style={{ fontSize: 12, color: 'var(--sp-ok)' }}>Saved</span>}
        </div>
      )}
    </div>
  )
}

// ── Loan policy ───────────────────────────────────────────

type LoanPolicy = {
  minAge: number
  maxAge: number
  maxDbrPercent: number
  defaultMaxLtvPercent: number
  minCibilScore: number
  minCompositeScoreAutoApprove: number
  requireKyc: boolean
  blockActiveDefault: boolean
}

function LoanPolicyPanel({ isAdmin }: { isAdmin: boolean }) {
  const auth = useStaffAuth()
  const [data, setData] = useState<LoanPolicy | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiRequest<LoanPolicy>('/staff/masters/loan-policy', { token: auth.token }).then(setData)
  }, [auth.token])

  async function save() {
    if (!data) return
    setError(null)
    setSaving(true)
    setSaved(false)
    try {
      const updated = await apiRequest<LoanPolicy>('/staff/masters/loan-policy', { method: 'PUT', token: auth.token, body: data })
      setData(updated)
      setSaved(true)
    } catch (e) {
      setError(e instanceof ApiError ? JSON.stringify(e.details ?? e.message) : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  if (!data) return null

  return (
    <div className="sp-card" style={{ maxWidth: 720 }}>
      <div className="sp-card-title">Loan policy</div>
      <p className="sp-sub" style={{ marginBottom: 16 }}>
        Eligibility thresholds used by the credit-assessment engine's policy checks (age, DBR, LTV, CIBIL, KYC,
        default history) and the auto-recommendation cutoff.
      </p>
      <div className="sp-form-grid">
        <div className="sp-field">
          <label>Min age</label>
          <input className="sp-input" type="number" value={data.minAge} disabled={!isAdmin} onChange={(e) => setData({ ...data, minAge: Number(e.target.value) })} />
        </div>
        <div className="sp-field">
          <label>Max age</label>
          <input className="sp-input" type="number" value={data.maxAge} disabled={!isAdmin} onChange={(e) => setData({ ...data, maxAge: Number(e.target.value) })} />
        </div>
        <div className="sp-field">
          <label>Max DBR (%)</label>
          <input className="sp-input" type="number" step="0.1" value={data.maxDbrPercent} disabled={!isAdmin} onChange={(e) => setData({ ...data, maxDbrPercent: Number(e.target.value) })} />
        </div>
        <div className="sp-field">
          <label>Default max LTV (%, when scheme doesn't set its own)</label>
          <input className="sp-input" type="number" step="0.1" value={data.defaultMaxLtvPercent} disabled={!isAdmin} onChange={(e) => setData({ ...data, defaultMaxLtvPercent: Number(e.target.value) })} />
        </div>
        <div className="sp-field">
          <label>Min CIBIL score</label>
          <input className="sp-input" type="number" value={data.minCibilScore} disabled={!isAdmin} onChange={(e) => setData({ ...data, minCibilScore: Number(e.target.value) })} />
        </div>
        <div className="sp-field">
          <label>Min composite score for auto-approve</label>
          <input
            className="sp-input"
            type="number"
            value={data.minCompositeScoreAutoApprove}
            disabled={!isAdmin}
            onChange={(e) => setData({ ...data, minCompositeScoreAutoApprove: Number(e.target.value) })}
          />
        </div>
        <label className="sp-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={data.requireKyc} disabled={!isAdmin} onChange={(e) => setData({ ...data, requireKyc: e.target.checked })} />
          Require KYC verification to pass
        </label>
        <label className="sp-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={data.blockActiveDefault} disabled={!isAdmin} onChange={(e) => setData({ ...data, blockActiveDefault: e.target.checked })} />
          Block applicants with an active default
        </label>
      </div>
      {error && <p className="cp-err">{error}</p>}
      {isAdmin && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <button className="sp-btn sp-btn-primary" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {saved && <span style={{ fontSize: 12, color: 'var(--sp-ok)' }}>Saved</span>}
        </div>
      )}
    </div>
  )
}

// ── Chart of accounts (GL) ────────────────────────────────

type GLAccount = {
  id: string
  code: string
  name: string
  cls: 'ASSETS' | 'LIABILITIES' | 'EQUITY' | 'INCOME' | 'EXPENSES' | 'CONTINGENT'
  level: number
  parentId: string | null
  isLeaf: boolean
  normalBalance: string | null
  currency: string | null
  mapLabel: string | null
  subGroup: string | null
  notes: string | null
  rangeFrom: string | null
  rangeTo: string | null
}

const GL_CLASSES: Array<GLAccount['cls'] | 'ALL'> = ['ALL', 'ASSETS', 'LIABILITIES', 'EQUITY', 'INCOME', 'EXPENSES', 'CONTINGENT']

function GLAccountsPanel() {
  const auth = useStaffAuth()
  const [rows, setRows] = useState<GLAccount[]>([])
  const [cls, setCls] = useState<GLAccount['cls'] | 'ALL'>('ALL')
  const [query, setQuery] = useState('')

  useEffect(() => {
    apiRequest<GLAccount[]>('/staff/masters/gl-accounts', { token: auth.token }).then(setRows)
  }, [auth.token])

  const q = query.trim().toLowerCase()
  const visible = rows.filter((r) => {
    if (cls !== 'ALL' && r.cls !== cls) return false
    if (q && !r.code.includes(q) && !r.name.toLowerCase().includes(q)) return false
    return true
  })

  return (
    <div>
      <p className="sp-sub" style={{ marginBottom: 16 }}>
        Bank-wide chart of accounts (main group → sub group → posting group), ported from the BIAB core-banking
        chart-of-accounts reference. Reference data — not yet editable from here.
      </p>
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'center' }}>
        <select className="sp-select" value={cls} onChange={(e) => setCls(e.target.value as GLAccount['cls'] | 'ALL')} style={{ minWidth: 200 }}>
          {GL_CLASSES.map((c) => (
            <option key={c} value={c}>
              {c === 'ALL' ? 'All main groups' : c}
            </option>
          ))}
        </select>
        <input
          className="sp-input"
          placeholder="Search code or name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ maxWidth: 260 }}
        />
        <span style={{ fontSize: 12, color: 'var(--sp-ink3)' }}>{visible.length} accounts</span>
      </div>
      <table className="sp-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Class</th>
            <th>Dr/Cr</th>
            <th>Currency</th>
            <th>Statement mapping</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r) => (
            <tr key={r.id}>
              <td style={{ fontFamily: 'monospace', paddingLeft: 12 + (r.level - 1) * 20 }}>{r.code}</td>
              <td style={{ fontWeight: r.isLeaf ? 400 : 700 }}>{r.name}</td>
              <td>{r.cls}</td>
              <td>{r.normalBalance ?? ''}</td>
              <td>{r.currency ?? ''}</td>
              <td style={{ fontSize: 12, color: 'var(--sp-ink3)' }}>{r.mapLabel ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
