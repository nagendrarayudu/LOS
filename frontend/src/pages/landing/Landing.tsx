import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiRequest } from '../../lib/api'
import { CURRENCY_BY_COUNTRY, formatMoney } from '../../lib/currency'
import { SchemeIcon } from './SchemeIcon'
import './Landing.css'

type Scheme = {
  id: string
  key: string
  name: string
  interestRate: string
  maxAmount: string
  ltvPercent: string | null
  description: string | null
}

const SCHEME_ORDER = ['gold', 'personal', 'msme', 'housing', 'lap', 'vehicle']

export function Landing() {
  const navigate = useNavigate()
  const [schemes, setSchemes] = useState<Scheme[]>([])
  const [country, setCountry] = useState('IN')

  useEffect(() => {
    apiRequest<Scheme[]>('/schemes')
      .then((data) =>
        setSchemes([...data].sort((a, b) => SCHEME_ORDER.indexOf(a.key) - SCHEME_ORDER.indexOf(b.key)))
      )
      .catch(() => setSchemes([]))
  }, [])

  const cur = useMemo(() => CURRENCY_BY_COUNTRY[country] ?? CURRENCY_BY_COUNTRY.IN, [country])

  return (
    <div className="lp">
      <nav className="lp-nav">
        <div className="lp-nav-brand">
          <div>
            <div className="lp-nav-name">Sahayog LOS</div>
            <div className="lp-nav-sub">Loan Origination System</div>
          </div>
        </div>
        <div className="lp-nav-links">
          <a href="#apps">Workspaces</a>
          <a href="#schemes">Schemes</a>
          <Link to="/staff">Staff LOS</Link>
        </div>
        <div className="lp-nav-btns">
          <select
            className="lp-select"
            aria-label="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            {Object.entries(CURRENCY_BY_COUNTRY).map(([code, c]) => (
              <option key={code} value={code}>
                {c.name}
              </option>
            ))}
          </select>
          <button className="lp-btn-ghost" onClick={() => navigate('/apply')}>
            Apply for a loan
          </button>
          <button className="lp-btn-saffron" onClick={() => navigate('/staff')}>
            Staff login →
          </button>
        </div>
      </nav>

      <section className="lp-hero">
        <div className="lp-hero-rule" />
        <div className="lp-hero-grid">
          <div className="lp-hero-left">
            <div className="lp-hero-eyebrow">
              <span />
              Cooperative Banking · India
            </div>
            <h1 className="lp-hero-h1">
              Credit that moves
              <br />
              at <em>people&apos;s pace.</em>
            </h1>
            <p className="lp-hero-body">
              A full loan origination system for cooperative and rural banks — from first contact
              through sanction and CBS disbursal. Paperless KYC, live bureau checks, maker-checker
              controls.
            </p>
            <div className="lp-hero-btns">
              <button className="lp-btn-primary" onClick={() => navigate('/apply')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
                </svg>
                Customer portal
              </button>
              <button className="lp-btn-outline" onClick={() => navigate('/staff')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                </svg>
                Bank
              </button>
            </div>
            <div className="lp-hero-stats">
              <div className="lp-stat-item">
                <div className="lp-stat-num">{schemes.length || 6}</div>
                <div className="lp-stat-lbl">Loan schemes</div>
              </div>
              <div className="lp-stat-item">
                <div className="lp-stat-num">7</div>
                <div className="lp-stat-lbl">KYC steps</div>
              </div>
              <div className="lp-stat-item">
                <div className="lp-stat-num">4</div>
                <div className="lp-stat-lbl">Languages</div>
              </div>
              <div className="lp-stat-item">
                <div className="lp-stat-num">∞</div>
                <div className="lp-stat-lbl">Tenants</div>
              </div>
            </div>
          </div>

          <div className="lp-hero-right">
            <div className="lp-scheme-stack">
              {schemes.map((s) => (
                <Link key={s.id} className="lp-scheme-slip" to={`/apply?scheme=${s.key}`}>
                  <div className="lp-slip-icon">
                    <SchemeIcon schemeKey={s.key} color="#10b981" />
                  </div>
                  <div className="lp-slip-name">{s.name.replace(' loan', '')}</div>
                  <div className="lp-slip-rate">
                    {Number(s.interestRate).toFixed(2)}
                    <small>%</small>
                  </div>
                  <div className="lp-slip-max">upto {formatMoney(Number(s.maxAmount), cur)}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="apps">
        <div className="lp-section">
          <div className="lp-section-label">Workspaces</div>
          <h2 className="lp-section-h">Two apps, one workflow.</h2>
          <p className="lp-section-sub">
            The customer portal handles the journey from discovery to submission. The staff LOS takes
            it from pipeline through sanction and disbursal.
          </p>

          <div className="lp-apps-grid">
            <div className="lp-app-card">
              <div className="lp-app-card-header">
                <div className="lp-app-card-tag">Customer portal</div>
                <h3>Apply from anywhere.</h3>
                <p className="lp-app-card-desc">
                  A 7-step guided journey — phone OTP, scheme selection, Aadhaar eKYC, DigiLocker,
                  live EMI calculator, document upload, and a real-time status timeline.
                </p>
              </div>
              <div className="lp-app-card-illus">
                <svg width="90%" height="80%" viewBox="0 0 280 140" aria-hidden="true">
                  <rect x="16" y="16" width="248" height="4" rx="2" fill="#E4DDD4" />
                  <rect x="16" y="16" width="140" height="4" rx="2" fill="#10B981" />
                  <circle cx="16" cy="18" r="5" fill="#10B981" />
                  <circle cx="51" cy="18" r="5" fill="#10B981" />
                  <circle cx="86" cy="18" r="5" fill="#10B981" />
                  <circle cx="121" cy="18" r="5" fill="#10B981" />
                  <circle cx="156" cy="18" r="5" fill="#10B981" />
                  <circle cx="191" cy="18" r="5" fill="#E4DDD4" />
                  <circle cx="226" cy="18" r="5" fill="#E4DDD4" />
                  <circle cx="264" cy="18" r="5" fill="#E4DDD4" />
                  <rect x="16" y="36" width="76" height="88" rx="8" fill="#FBF7F0" stroke="#E4DDD4" strokeWidth={0.5} />
                  <rect x="24" y="48" width="20" height="20" rx="5" fill="#ECFDF5" />
                  <rect x="24" y="74" width="40" height="4" rx="2" fill="#1C1410" />
                  <rect x="24" y="82" width="28" height="8" rx="2" fill="#10B981" />
                  <rect x="101" y="36" width="76" height="88" rx="8" fill="#FBF7F0" stroke="#E4DDD4" strokeWidth={0.5} />
                  <circle cx="139" cy="62" r="14" fill="#E4DDD4" stroke="#FBF7F0" strokeWidth={1} />
                  <rect x="119" y="82" width="40" height="4" rx="2" fill="#1C1410" />
                  <rect x="119" y="100" width="48" height="6" rx="3" fill="#10B981" />
                  <rect x="186" y="36" width="78" height="88" rx="8" fill="#FBF7F0" stroke="#E4DDD4" strokeWidth={0.5} />
                  <rect x="194" y="48" width="48" height="3" rx="1.5" fill="#1C1410" />
                  <rect x="194" y="58" width="8" height="8" rx="4" fill="#1A7A4E" />
                  <rect x="194" y="72" width="8" height="8" rx="4" fill="#1A7A4E" />
                  <rect x="194" y="86" width="8" height="8" rx="4" fill="#10B981" />
                </svg>
              </div>
              <div className="lp-app-card-chips">
                <span className="lp-chip">Aadhaar eKYC</span>
                <span className="lp-chip">DigiLocker</span>
                <span className="lp-chip">Live EMI</span>
                <span className="lp-chip">4 languages</span>
                <span className="lp-chip">Status timeline</span>
              </div>
              <div className="lp-app-card-footer">
                <button className="lp-app-card-cta" onClick={() => navigate('/apply')}>
                  Open customer portal
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="lp-app-card dark">
              <div className="lp-app-card-header">
                <div className="lp-app-card-tag">Bank</div>
                <h3>Pipeline to disbursal.</h3>
                <p className="lp-app-card-desc">
                  KPI dashboard, application detail with composite credit score, maker-checker or
                  committee sanction workflow, and CBS live or NEFT file-generation disbursal.
                </p>
              </div>
              <div className="lp-app-card-illus">
                <svg width="90%" height="80%" viewBox="0 0 280 140" aria-hidden="true">
                  <rect x="0" y="0" width="44" height="140" fill="#162434" />
                  <rect x="10" y="12" width="24" height="5" rx="2.5" fill="#10B981" />
                  <rect x="10" y="24" width="24" height="3" rx="1.5" fill="rgba(255,255,255,0.15)" />
                  <rect x="52" y="10" width="54" height="28" rx="5" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
                  <rect x="58" y="22" width="36" height="7" rx="2" fill="#fff" />
                  <rect x="114" y="10" width="54" height="28" rx="5" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
                  <rect x="120" y="22" width="30" height="7" rx="2" fill="#10B981" />
                  <rect x="176" y="10" width="54" height="28" rx="5" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
                  <rect x="182" y="22" width="34" height="7" rx="2" fill="#fff" />
                  <rect x="52" y="46" width="178" height="11" rx="3" fill="rgba(255,255,255,0.04)" />
                  <rect x="170" y="49" width="30" height="5" rx="2.5" fill="rgba(26,122,78,0.4)" />
                  <rect x="52" y="60" width="178" height="11" rx="3" fill="rgba(255,255,255,0.02)" />
                  <rect x="170" y="63" width="30" height="5" rx="2.5" fill="rgba(16,185,129,0.4)" />
                  <circle cx="141" cy="112" r="18" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={5} />
                  <circle cx="141" cy="112" r="18" fill="none" stroke="#10B981" strokeWidth={5} strokeDasharray="82 31" strokeDashoffset={28} />
                </svg>
              </div>
              <div className="lp-app-card-chips">
                <span className="lp-chip">Pipeline</span>
                <span className="lp-chip">Maker-checker</span>
                <span className="lp-chip">Credit score</span>
                <span className="lp-chip">Sanction</span>
                <span className="lp-chip">CBS / NEFT</span>
              </div>
              <div className="lp-app-card-footer">
                <button className="lp-app-card-cta" onClick={() => navigate('/staff')}>
                  Open staff LOS
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="schemes" style={{ background: '#fff', borderTop: '1px solid var(--line)' }}>
        <div className="lp-section">
          <div className="lp-section-label">Schemes in scope</div>
          <h2 className="lp-section-h">Six products, one system.</h2>
          <p className="lp-section-sub">
            Every scheme is fully configured — rates, LTV, tenure limits, required documents, and CBS
            integration paths.
          </p>

          <div className="lp-schemes-grid">
            {schemes.map((s) => (
              <Link key={s.id} className="lp-scheme-card" to={`/apply?scheme=${s.key}`}>
                <div className="lp-scheme-icon">
                  <SchemeIcon schemeKey={s.key} size={18} />
                </div>
                <div className="lp-scheme-name">{s.name}</div>
                <div className="lp-scheme-rate">
                  {Number(s.interestRate).toFixed(2)}%<small>p.a.</small>
                </div>
                <div className="lp-scheme-desc">
                  {s.description} · upto {formatMoney(Number(s.maxAmount), cur)}
                  {s.ltvPercent ? ` · ${Number(s.ltvPercent)}% LTV` : ''}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-ftr-copy">© 2026 Sahayog LOS · Demo build</div>
        <div className="lp-ftr-links">
          <Link to="/apply">Customer portal</Link>
          <Link to="/staff">Staff LOS</Link>
        </div>
        <div className="lp-ftr-brand">Sahayog LOS</div>
      </footer>
    </div>
  )
}
