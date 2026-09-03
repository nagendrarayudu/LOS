import { useState } from 'react'
import { apiRequest, ApiError } from '../../lib/api'
import { useCustomerAuth } from './CustomerAuthContext'
import { AadhaarScanner } from './AadhaarScanner'
import { AadhaarOtpVerify } from './AadhaarOtpVerify'
import { DigilockerVerify } from './DigilockerVerify'
import type { AadhaarQrFields } from '../../lib/aadhaarQr'

const DEMO_PROFILES: Record<string, { name: string; dob: string; gender: 'Male' | 'Female'; pan: string; aadhaar: string; city: string; state: string; pincode: string; occupation: string; employer: string; netIncome: number }> = {
  '999988887777': { name: 'Venkata Ramana Reddy', dob: '1981-06-14', gender: 'Male', pan: 'AXBPR4521K', aadhaar: '999988887777', city: 'Khammam', state: 'Telangana', pincode: '507001', occupation: 'Salaried', employer: 'Singareni Collieries (Govt)', netIncome: 62000 },
  '111122223333': { name: 'Sunitha Devi', dob: '1990-02-21', gender: 'Female', pan: 'BXCPD7789L', aadhaar: '111122223333', city: 'Wyra', state: 'Telangana', pincode: '507165', occupation: 'Self-employed', employer: 'Self-employed — retail', netIncome: 48000 },
}

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/
const AADHAAR_RE = /^\d{12}$/
const PINCODE_RE = /^\d{6}$/

type Props = {
  applicationId: string
  onDone: () => void
}

function FieldError({ id, message }: { id: string; message: string | null }) {
  if (!message) return null
  return (
    <p className="cp-field-err" id={id} role="alert">
      {message}
    </p>
  )
}

export function KycStep({ applicationId, onDone }: Props) {
  const auth = useCustomerAuth()
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male')
  const [pan, setPan] = useState('')
  const [aadhaar, setAadhaar] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [city, setCity] = useState('')
  const [stateVal, setStateVal] = useState('')
  const [pincode, setPincode] = useState('')
  const [occupation, setOccupation] = useState('')
  const [employer, setEmployer] = useState('')
  const [netIncome, setNetIncome] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [scanNote, setScanNote] = useState<string | null>(null)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  function touch(field: string) {
    setTouched((t) => (t[field] ? t : { ...t, [field]: true }))
  }

  function applyScannedFields(fields: AadhaarQrFields) {
    if (fields.aadhaarNumber) setAadhaar(fields.aadhaarNumber)
    if (fields.name) setName(fields.name)
    if (fields.dob) setDob(fields.dob)
    if (fields.gender) setGender(fields.gender)
    if (fields.addressLine1) setAddressLine1(fields.addressLine1)
    if (fields.city) setCity(fields.city)
    if (fields.state) setStateVal(fields.state)
    if (fields.pincode) setPincode(fields.pincode)

    if (!fields.aadhaarNumber && fields.aadhaarLast4) {
      setScanNote(
        `Scanned — most fields filled in. Your card's QR only exposes the last 4 digits (••••${fields.aadhaarLast4}) per UIDAI's masking rules, so please type the full 12-digit Aadhaar number yourself.`
      )
    } else {
      setScanNote('Scanned successfully — review the fields below before continuing.')
    }
  }

  function applyOtpVerifiedFields(fields: {
    name?: string
    dob?: string
    gender?: 'Male' | 'Female' | 'Other'
    addressLine1?: string
    city?: string
    state?: string
    pincode?: string
  }) {
    if (fields.name) setName(fields.name)
    if (fields.dob) setDob(fields.dob)
    if (fields.gender) setGender(fields.gender)
    if (fields.addressLine1) setAddressLine1(fields.addressLine1)
    if (fields.city) setCity(fields.city)
    if (fields.state) setStateVal(fields.state)
    if (fields.pincode) setPincode(fields.pincode)
    setScanNote('OTP verified — details fetched and filled in below. Review before continuing.')
  }

  function applyDigilockerFields(fields: {
    name?: string
    dob?: string
    gender?: 'Male' | 'Female' | 'Other'
    addressLine1?: string
    city?: string
    state?: string
    pincode?: string
    aadhaarLast4?: string
  }) {
    if (fields.name) setName(fields.name)
    if (fields.dob) setDob(fields.dob)
    if (fields.gender) setGender(fields.gender)
    if (fields.addressLine1) setAddressLine1(fields.addressLine1)
    if (fields.city) setCity(fields.city)
    if (fields.state) setStateVal(fields.state)
    if (fields.pincode) setPincode(fields.pincode)
    setScanNote(
      fields.aadhaarLast4
        ? `DigiLocker verified — most fields filled in. DigiLocker only shares the last 4 digits (••••${fields.aadhaarLast4}), so please type the full 12-digit Aadhaar number yourself.`
        : 'DigiLocker verified — details fetched and filled in below. Review before continuing.'
    )
  }

  function applyDemo(key: string) {
    const d = DEMO_PROFILES[key]
    setName(d.name)
    setDob(d.dob)
    setGender(d.gender)
    setPan(d.pan)
    setAadhaar(d.aadhaar)
    setAddressLine1('12-3, Main Road')
    setCity(d.city)
    setStateVal(d.state)
    setPincode(d.pincode)
    setOccupation(d.occupation)
    setEmployer(d.employer)
    setNetIncome(String(d.netIncome))
  }

  async function submit() {
    setError(null)
    setSaving(true)
    try {
      await apiRequest(`/customer/applications/${applicationId}/kyc`, {
        method: 'PUT',
        token: auth.token,
        body: {
          name,
          dob,
          gender,
          panNumber: pan.toUpperCase(),
          aadhaarNumber: aadhaar,
          addressLine1,
          city,
          state: stateVal,
          pincode,
          occupation,
          employer,
          netIncome: Number(netIncome),
        },
      })
      onDone()
    } catch (e) {
      setError(e instanceof ApiError ? JSON.stringify(e.details ?? e.message) : 'Could not save KYC details')
    } finally {
      setSaving(false)
    }
  }

  const fieldErrors: Record<string, string | null> = {
    name: name.trim().length >= 2 ? null : 'Enter the customer’s full legal name, as it appears on their ID.',
    dob: dob ? null : 'Select a date of birth.',
    pan: PAN_RE.test(pan.toUpperCase()) ? null : 'Enter a valid PAN — 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).',
    aadhaar: AADHAAR_RE.test(aadhaar) ? null : 'Aadhaar number must be exactly 12 digits.',
    addressLine1: addressLine1.trim().length >= 3 ? null : 'Enter the house / street address.',
    city: city.trim().length >= 2 ? null : 'Enter a city or town.',
    stateVal: stateVal.trim().length >= 2 ? null : 'Enter a state.',
    pincode: PINCODE_RE.test(pincode) ? null : 'PIN code must be 6 digits.',
    occupation: occupation.trim().length >= 2 ? null : 'Enter an occupation.',
    employer: employer.trim().length >= 2 ? null : 'Enter an employer name.',
    netIncome: Number(netIncome) > 0 ? null : 'Enter a monthly net income greater than zero.',
  }
  const showErr = (field: string) => (touched[field] ? fieldErrors[field] : null)
  const invalidCls = (field: string) => `cp-field${touched[field] && fieldErrors[field] ? ' invalid' : ''}`
  const valid = Object.values(fieldErrors).every((e) => e === null)

  return (
    <div>
      <div className="cp-step-label">Step 1 of 3 · KYC</div>
      <h1 className="cp-h1">Verify your identity</h1>
      <p className="cp-sub">
        Verify via Aadhaar OTP or QR scan below, or enter details manually. This demo build uses a synthetic eKYC
        provider — no real UIDAI data is accessed.
      </p>

      <div className="cp-demo-panel">
        <span className="tag">Demo</span>
        Auto-fill &amp; verify a sample customer:
        <button className="cp-btn-ghost" style={{ fontWeight: 700, padding: '4px 0' }} onClick={() => applyDemo('999988887777')}>
          Venkata Ramana
        </button>
        <button className="cp-btn-ghost" style={{ fontWeight: 700, padding: '4px 0' }} onClick={() => applyDemo('111122223333')}>
          Sunitha Devi
        </button>
      </div>

      <div className="cp-section">
        <div className="cp-section-head">
          <div className="cp-section-eyebrow">Section 1</div>
          <div className="cp-section-title">Identity verification</div>
          <p className="cp-section-desc">Verify the customer against an issuing authority where possible — this pre-fills and locks the fields below. Manual entry is always available as a fallback.</p>
        </div>

        <div className="cp-field">
          <label className="cp-label" htmlFor="kyc-aadhaar-verify">
            Aadhaar number
          </label>
          <input
            id="kyc-aadhaar-verify"
            className="cp-input"
            inputMode="numeric"
            maxLength={12}
            value={aadhaar}
            onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, '').slice(0, 12))}
            placeholder="12-digit Aadhaar number"
          />
        </div>

        <AadhaarOtpVerify applicationId={applicationId} aadhaarNumber={aadhaar} onVerified={applyOtpVerifiedFields} />

        <DigilockerVerify applicationId={applicationId} onVerified={applyDigilockerFields} />

        <p className="cp-hint" style={{ margin: '4px 0 10px' }}>— or —</p>

        <AadhaarScanner onScanned={applyScannedFields} />
        {scanNote && (
          <div className="cp-info-panel">
            <span className="cp-badge cp-badge-ok" style={{ flexShrink: 0 }}>
              ✓ Verified
            </span>
            <span>{scanNote}</span>
          </div>
        )}
      </div>

      <div className="cp-section">
        <div className="cp-section-head">
          <div className="cp-section-eyebrow">Section 2</div>
          <div className="cp-section-title">Personal details</div>
          <p className="cp-section-desc">Locked automatically once identity is verified above — editable only when details were entered manually.</p>
        </div>

        <div className="cp-field">
          <label className="cp-label" htmlFor="kyc-name">
            Full name <span className="req">*</span>
          </label>
          <input
            id="kyc-name"
            className="cp-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => touch('name')}
            aria-required="true"
            aria-invalid={!!showErr('name')}
          />
          <FieldError id="kyc-name-err" message={showErr('name')} />
        </div>

        <div className="cp-field-grid">
          <div className={invalidCls('dob')}>
            <label className="cp-label" htmlFor="kyc-dob">
              Date of birth <span className="req">*</span>
            </label>
            <input
              id="kyc-dob"
              className="cp-input"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              onBlur={() => touch('dob')}
              aria-required="true"
              aria-invalid={!!showErr('dob')}
            />
            <FieldError id="kyc-dob-err" message={showErr('dob')} />
          </div>
          <div className="cp-field">
            <label className="cp-label" htmlFor="kyc-gender">
              Gender <span className="req">*</span>
            </label>
            <select id="kyc-gender" className="cp-select" value={gender} onChange={(e) => setGender(e.target.value as 'Male' | 'Female' | 'Other')}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      <div className="cp-section">
        <div className="cp-section-head">
          <div className="cp-section-eyebrow">Section 3</div>
          <div className="cp-section-title">Identification numbers</div>
          <p className="cp-section-desc">Government-issued identifiers used for KYC and tax reporting. Aadhaar was captured during identity verification above.</p>
        </div>

        <div className={`${invalidCls('pan')} mono`} style={{ maxWidth: 260 }}>
          <label className="cp-label" htmlFor="kyc-pan">
            PAN number <span className="req">*</span>
          </label>
          <input
            id="kyc-pan"
            className="cp-input"
            maxLength={10}
            value={pan}
            onChange={(e) => setPan(e.target.value.toUpperCase().slice(0, 10))}
            onBlur={() => touch('pan')}
            placeholder="ABCDE1234F"
            aria-required="true"
            aria-invalid={!!showErr('pan')}
          />
          {!showErr('pan') && <p className="cp-helper">Format: 5 letters, 4 digits, 1 letter.</p>}
          <FieldError id="kyc-pan-err" message={showErr('pan')} />
        </div>
      </div>

      <div className="cp-section">
        <div className="cp-section-head">
          <div className="cp-section-eyebrow">Section 4</div>
          <div className="cp-section-title">Residential address</div>
          <p className="cp-section-desc">Used as the address of record for correspondence and KYC.</p>
        </div>

        <div className="cp-field">
          <label className="cp-label" htmlFor="kyc-addr1">
            Address line 1 <span className="req">*</span>
          </label>
          <input
            id="kyc-addr1"
            className="cp-input"
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
            onBlur={() => touch('addressLine1')}
            placeholder="House / street"
            aria-required="true"
            aria-invalid={!!showErr('addressLine1')}
          />
          <FieldError id="kyc-addr1-err" message={showErr('addressLine1')} />
        </div>
        <div className="cp-field-grid">
          <div className={invalidCls('city')}>
            <label className="cp-label" htmlFor="kyc-city">
              City <span className="req">*</span>
            </label>
            <input id="kyc-city" className="cp-input" value={city} onChange={(e) => setCity(e.target.value)} onBlur={() => touch('city')} aria-required="true" aria-invalid={!!showErr('city')} />
            <FieldError id="kyc-city-err" message={showErr('city')} />
          </div>
          <div className={invalidCls('stateVal')}>
            <label className="cp-label" htmlFor="kyc-state">
              State <span className="req">*</span>
            </label>
            <input id="kyc-state" className="cp-input" value={stateVal} onChange={(e) => setStateVal(e.target.value)} onBlur={() => touch('stateVal')} aria-required="true" aria-invalid={!!showErr('stateVal')} />
            <FieldError id="kyc-state-err" message={showErr('stateVal')} />
          </div>
          <div className={`${invalidCls('pincode')} mono`}>
            <label className="cp-label" htmlFor="kyc-pincode">
              PIN code <span className="req">*</span>
            </label>
            <input
              id="kyc-pincode"
              className="cp-input"
              inputMode="numeric"
              maxLength={6}
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onBlur={() => touch('pincode')}
              aria-required="true"
              aria-invalid={!!showErr('pincode')}
            />
            <FieldError id="kyc-pincode-err" message={showErr('pincode')} />
          </div>
        </div>
      </div>

      <div className="cp-section">
        <div className="cp-section-head">
          <div className="cp-section-eyebrow">Section 5</div>
          <div className="cp-section-title">Employment &amp; income</div>
          <p className="cp-section-desc">Used to assess repayment capacity and eligibility.</p>
        </div>

        <div className="cp-field-grid">
          <div className={invalidCls('occupation')}>
            <label className="cp-label" htmlFor="kyc-occupation">
              Occupation <span className="req">*</span>
            </label>
            <input
              id="kyc-occupation"
              className="cp-input"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              onBlur={() => touch('occupation')}
              placeholder="Salaried / Self-employed"
              aria-required="true"
              aria-invalid={!!showErr('occupation')}
            />
            <FieldError id="kyc-occupation-err" message={showErr('occupation')} />
          </div>
          <div className={invalidCls('employer')}>
            <label className="cp-label" htmlFor="kyc-employer">
              Employer <span className="req">*</span>
            </label>
            <input id="kyc-employer" className="cp-input" value={employer} onChange={(e) => setEmployer(e.target.value)} onBlur={() => touch('employer')} aria-required="true" aria-invalid={!!showErr('employer')} />
            <FieldError id="kyc-employer-err" message={showErr('employer')} />
          </div>
        </div>
        <div className={invalidCls('netIncome')} style={{ maxWidth: 260 }}>
          <label className="cp-label" htmlFor="kyc-income">
            Monthly net income <span className="req">*</span>
          </label>
          <div className="cp-prefix-wrap">
            <span className="cp-prefix" aria-hidden="true">
              ₹
            </span>
            <input
              id="kyc-income"
              className="cp-input"
              inputMode="numeric"
              value={netIncome}
              onChange={(e) => setNetIncome(e.target.value.replace(/\D/g, ''))}
              onBlur={() => touch('netIncome')}
              aria-required="true"
              aria-invalid={!!showErr('netIncome')}
            />
          </div>
          <FieldError id="kyc-income-err" message={showErr('netIncome')} />
        </div>
      </div>

      {error && <p className="cp-err">{error}</p>}
      <button className="cp-btn cp-btn-primary" style={{ marginTop: 24 }} disabled={!valid || saving} onClick={submit}>
        {saving ? 'Verifying…' : 'Verify & continue'}
      </button>
    </div>
  )
}
