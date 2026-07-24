import { useState } from 'react'
import { apiRequest, ApiError } from '../../lib/api'
import { useStaffAuth } from './StaffAuthContext'

export function StaffLogin() {
  const auth = useStaffAuth()
  const [email, setEmail] = useState('officer@sahayog.coop')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit() {
    setError(null)
    setLoading(true)
    try {
      const res = await apiRequest<{ token: string; user: { id: string; name: string; email: string; role: string } }>(
        '/auth/staff/login',
        { method: 'POST', body: { email, password } }
      )
      auth.login(res.token, res.user as never)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="sp-login-wrap">
      <div className="sp-login-card">
        <h1 className="sp-h1">Sahayog LOS</h1>
        <p className="sp-sub">Staff sign-in</p>
        <div className="cp-field">
          <label className="cp-label">Email</label>
          <input className="cp-input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="cp-field">
          <label className="cp-label">Password</label>
          <input className="cp-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        </div>
        <div className="cp-demo-hint">
          Demo password for every seeded staff account: <b>Passw0rd!</b>
          <br />
          Try officer@ / manager@ / committee1..5@ / disbursal@ / admin@sahayog.coop
        </div>
        {error && <p className="cp-err">{error}</p>}
        <button className="cp-btn cp-btn-primary" disabled={loading} onClick={submit}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </div>
    </div>
  )
}
