import { useState } from 'react'
import { apiRequest, ApiError } from '../../lib/api'
import { useCustomerAuth } from './CustomerAuthContext'

type Demographics = {
  name?: string
  dob?: string
  gender?: 'Male' | 'Female' | 'Other'
  addressLine1?: string
  city?: string
  state?: string
  pincode?: string
  aadhaarLast4?: string
}

type Props = {
  applicationId: string
  aadhaarNumber: string
  onVerified: (fields: Demographics) => void
}

export function AadhaarOtpVerify({ applicationId, aadhaarNumber, onVerified }: Props) {
  const auth = useCustomerAuth()
  const [stage, setStage] = useState<'idle' | 'otp-sent'>('idle')
  const [providerRef, setProviderRef] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [demoOtp, setDemoOtp] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const aadhaarValid = /^\d{12}$/.test(aadhaarNumber)

  async function sendOtp() {
    setError(null)
    setLoading(true)
    try {
      const res = await apiRequest<{ providerRef: string; demoOtp?: string }>(`/customer/applications/${applicationId}/aadhaar-ekyc/otp`, {
        method: 'POST',
        token: auth.token,
        body: { aadhaarNumber },
      })
      setProviderRef(res.providerRef)
      setDemoOtp(res.demoOtp ?? null)
      setStage('otp-sent')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not request OTP')
    } finally {
      setLoading(false)
    }
  }

  async function verify() {
    if (!providerRef) return
    setError(null)
    setLoading(true)
    try {
      const fields = await apiRequest<Demographics>(`/customer/applications/${applicationId}/aadhaar-ekyc/verify`, {
        method: 'POST',
        token: auth.token,
        body: { providerRef, otp },
      })
      onVerified(fields)
      setStage('idle')
      setOtp('')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not verify OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="cp-field">
      <label className="cp-label">Verify via Aadhaar-linked mobile OTP</label>

      {stage === 'idle' && (
        <button type="button" className="cp-btn cp-btn-secondary" disabled={!aadhaarValid || loading} onClick={sendOtp}>
          {loading ? 'Sending…' : aadhaarValid ? 'Send OTP to Aadhaar-linked mobile' : 'Enter a 12-digit Aadhaar number above first'}
        </button>
      )}

      {stage === 'otp-sent' && (
        <>
          {demoOtp && <div className="cp-demo-hint">⚡ Demo build — OTP is {demoOtp}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="cp-input"
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <button type="button" className="cp-btn cp-btn-primary" style={{ width: 'auto' }} disabled={otp.length < 4 || loading} onClick={verify}>
              {loading ? 'Verifying…' : 'Verify'}
            </button>
          </div>
          <button type="button" className="cp-btn-ghost" onClick={() => setStage('idle')}>
            ← Use a different Aadhaar number
          </button>
        </>
      )}

      {error && <p className="cp-err">{error}</p>}
      <p className="cp-hint">
        Sends a one-time password to the mobile number linked to this Aadhaar, then fetches your demographic details on
        successful verification — the same consent flow used by licensed eKYC vendors.
      </p>
    </div>
  )
}
