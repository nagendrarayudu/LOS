import { useState } from 'react'
import { apiRequest, ApiError } from '../../lib/api'
import { useCustomerAuth } from './CustomerAuthContext'

export function CustomerLogin() {
  const auth = useCustomerAuth()
  const [stage, setStage] = useState<'mobile' | 'otp'>('mobile')
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [demoOtp, setDemoOtp] = useState<string | null>(null)

  async function requestOtp() {
    setError(null)
    setLoading(true)
    try {
      const res = await apiRequest<{ sent: boolean; demoOtp?: string }>('/auth/customer/otp/request', {
        method: 'POST',
        body: { mobile },
      })
      setDemoOtp(res.demoOtp ?? null)
      setStage('otp')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function verifyOtp() {
    setError(null)
    setLoading(true)
    try {
      const res = await apiRequest<{ token: string; customer: { id: string; mobile: string; name: string | null } }>(
        '/auth/customer/otp/verify',
        { method: 'POST', body: { mobile, otp } }
      )
      auth.login(res.token, res.customer)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="cp-h1">Apply for a loan</h1>
      <p className="cp-sub">Verify your mobile number to start or continue an application.</p>

      {stage === 'mobile' && (
        <>
          <div className="cp-field">
            <label className="cp-label">Mobile number</label>
            <input
              className="cp-input"
              inputMode="numeric"
              placeholder="10-digit mobile number"
              value={mobile}
              maxLength={10}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
            />
          </div>
          {error && <p className="cp-err">{error}</p>}
          <button className="cp-btn cp-btn-primary" disabled={mobile.length !== 10 || loading} onClick={requestOtp}>
            {loading ? 'Sending OTP…' : 'Send OTP'}
          </button>
        </>
      )}

      {stage === 'otp' && (
        <>
          {demoOtp && <div className="cp-demo-hint">⚡ Demo build — OTP is {demoOtp}</div>}
          <div className="cp-field">
            <label className="cp-label">Enter the 6-digit OTP sent to +91 {mobile}</label>
            <input
              className="cp-input"
              inputMode="numeric"
              placeholder="6-digit OTP"
              value={otp}
              maxLength={6}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </div>
          {error && <p className="cp-err">{error}</p>}
          <button className="cp-btn cp-btn-primary" disabled={otp.length !== 6 || loading} onClick={verifyOtp}>
            {loading ? 'Verifying…' : 'Verify & continue'}
          </button>
          <button className="cp-btn cp-btn-ghost" onClick={() => setStage('mobile')}>
            ← Change mobile number
          </button>
        </>
      )}
    </div>
  )
}
