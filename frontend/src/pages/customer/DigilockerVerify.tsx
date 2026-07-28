import { useEffect, useRef, useState } from 'react'
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
  onVerified: (fields: Demographics) => void
}

export function DigilockerVerify({ applicationId, onVerified }: Props) {
  const auth = useCustomerAuth()
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [polling, setPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    apiRequest<{ configured: boolean }>('/customer/applications/configured', { token: auth.token })
      .then((res) => setConfigured(res.configured))
      .catch(() => setConfigured(false))
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function start() {
    setError(null)
    try {
      const res = await apiRequest<{ url: string; requestId: string }>(`/customer/applications/${applicationId}/digilocker/start`, {
        method: 'POST',
        token: auth.token,
      })
      window.open(res.url, '_blank', 'noopener,noreferrer')
      setPolling(true)
      pollRef.current = setInterval(async () => {
        try {
          const status = await apiRequest<{ status: string; demographics: Demographics | null }>(
            `/customer/applications/${applicationId}/digilocker/status`,
            { token: auth.token }
          )
          if (status.status === 'success' && status.demographics) {
            if (pollRef.current) clearInterval(pollRef.current)
            setPolling(false)
            onVerified(status.demographics)
          } else if (status.status === 'failure') {
            if (pollRef.current) clearInterval(pollRef.current)
            setPolling(false)
            setError('DigiLocker verification was not completed or was declined. You can try again or use another method below.')
          }
        } catch {
          // transient poll failure — keep trying until the interval is cleared
        }
      }, 3000)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start DigiLocker verification')
    }
  }

  // Needs real vendor credentials + a public callback URL — not available in every
  // environment (e.g. local dev without a tunnel), so this option simply doesn't
  // appear rather than showing a broken button.
  if (configured === null || configured === false) return null

  return (
    <div className="cp-field">
      <label className="cp-label">Verify via DigiLocker</label>
      {!polling && (
        <button type="button" className="cp-btn cp-btn-secondary" onClick={start}>
          Verify with DigiLocker
        </button>
      )}
      {polling && (
        <div className="cp-demo-hint">
          Waiting for you to complete verification in the DigiLocker tab that just opened… this updates automatically
          once you finish there.
        </div>
      )}
      {error && <p className="cp-err">{error}</p>}
      <p className="cp-hint">Opens DigiLocker in a new tab to authenticate and consent to share your Aadhaar.</p>
    </div>
  )
}
