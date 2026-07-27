import { useState } from 'react'
import { apiRequest, ApiError } from '../../lib/api'
import { useCustomerAuth } from './CustomerAuthContext'
import { AadhaarScanner } from './AadhaarScanner'
import type { AadhaarQrFields } from '../../lib/aadhaarQr'

const DEMO_PROFILES: Record<string, { name: string; dob: string; gender: 'Male' | 'Female'; pan: string; aadhaar: string; city: string; state: string; pincode: string; occupation: string; employer: string; netIncome: number }> = {
  '999988887777': { name: 'Venkata Ramana Reddy', dob: '1981-06-14', gender: 'Male', pan: 'AXBPR4521K', aadhaar: '999988887777', city: 'Khammam', state: 'Telangana', pincode: '507001', occupation: 'Salaried', employer: 'Singareni Collieries (Govt)', netIncome: 62000 },
  '111122223333': { name: 'Sunitha Devi', dob: '1990-02-21', gender: 'Female', pan: 'BXCPD7789L', aadhaar: '111122223333', city: 'Wyra', state: 'Telangana', pincode: '507165', occupation: 'Self-employed', employer: 'Self-employed — retail', netIncome: 48000 },
}

type Props = {
  applicationId: string
  onDone: () => void
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

  const valid =
    name.length >= 2 &&
    dob &&
    /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.toUpperCase()) &&
    /^\d{12}$/.test(aadhaar) &&
    addressLine1.length >= 3 &&
    city.length >= 2 &&
    stateVal.length >= 2 &&
    /^\d{6}$/.test(pincode) &&
    occupation.length >= 2 &&
    employer.length >= 2 &&
    Number(netIncome) > 0

  return (
    <div>
      <div className="cp-step-label">Step 1 of 3 · KYC</div>
      <h1 className="cp-h1">Verify your identity</h1>
      <p className="cp-sub">Enter Aadhaar &amp; PAN details for eKYC. This demo auto-fills from a sample UIDAI record.</p>

      <div className="cp-demo-hint" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        ⚡ Demo — tap to auto-fill &amp; verify:
        <button className="cp-btn-ghost" style={{ fontWeight: 700 }} onClick={() => applyDemo('999988887777')}>
          Venkata Ramana
        </button>
        <button className="cp-btn-ghost" style={{ fontWeight: 700 }} onClick={() => applyDemo('111122223333')}>
          Sunitha Devi
        </button>
      </div>

      <AadhaarScanner onScanned={applyScannedFields} />
      {scanNote && <div className="cp-demo-hint">{scanNote}</div>}

      <div className="cp-field">
        <label className="cp-label">Aadhaar number</label>
        <input className="cp-input" inputMode="numeric" maxLength={12} value={aadhaar} onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="12-digit Aadhaar number" />
      </div>
      <div className="cp-field">
        <label className="cp-label">PAN number</label>
        <input className="cp-input" maxLength={10} value={pan} onChange={(e) => setPan(e.target.value.toUpperCase().slice(0, 10))} placeholder="ABCDE1234F" />
      </div>
      <div className="cp-field">
        <label className="cp-label">Full name</label>
        <input className="cp-input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="cp-field">
          <label className="cp-label">Date of birth</label>
          <input className="cp-input" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        </div>
        <div className="cp-field">
          <label className="cp-label">Gender</label>
          <select className="cp-select" value={gender} onChange={(e) => setGender(e.target.value as 'Male' | 'Female' | 'Other')}>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
      <div className="cp-field">
        <label className="cp-label">Address</label>
        <input className="cp-input" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="House / street" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div className="cp-field">
          <label className="cp-label">City</label>
          <input className="cp-input" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="cp-field">
          <label className="cp-label">State</label>
          <input className="cp-input" value={stateVal} onChange={(e) => setStateVal(e.target.value)} />
        </div>
        <div className="cp-field">
          <label className="cp-label">Pincode</label>
          <input className="cp-input" inputMode="numeric" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="cp-field">
          <label className="cp-label">Occupation</label>
          <input className="cp-input" value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="Salaried / Self-employed" />
        </div>
        <div className="cp-field">
          <label className="cp-label">Employer</label>
          <input className="cp-input" value={employer} onChange={(e) => setEmployer(e.target.value)} />
        </div>
      </div>
      <div className="cp-field">
        <label className="cp-label">Monthly net income (₹)</label>
        <input className="cp-input" inputMode="numeric" value={netIncome} onChange={(e) => setNetIncome(e.target.value.replace(/\D/g, ''))} />
      </div>

      {error && <p className="cp-err">{error}</p>}
      <button className="cp-btn cp-btn-primary" disabled={!valid || saving} onClick={submit}>
        {saving ? 'Verifying…' : 'Verify & continue'}
      </button>
    </div>
  )
}
