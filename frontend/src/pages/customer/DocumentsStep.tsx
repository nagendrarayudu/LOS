import { useEffect, useRef, useState } from 'react'
import { apiRequest, ApiError } from '../../lib/api'
import { useCustomerAuth } from './CustomerAuthContext'

type DocEntry = { id: string; label: string; hint: string; tag: string; uploaded: boolean }
type RequiredDocs = { required: DocEntry[]; optional: DocEntry[] }

type Props = {
  applicationId: string
  onDone: () => void
  onBack: () => void
}

export function DocumentsStep({ applicationId, onDone, onBack }: Props) {
  const auth = useCustomerAuth()
  const [docs, setDocs] = useState<RequiredDocs | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingDocType = useRef<string | null>(null)

  function load() {
    apiRequest<RequiredDocs>(`/customer/applications/${applicationId}/documents/required`, { token: auth.token }).then(setDocs)
  }

  useEffect(load, [applicationId, auth.token])

  function triggerUpload(docId: string) {
    pendingDocType.current = docId
    fileInputRef.current?.click()
  }

  async function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const docType = pendingDocType.current
    if (!file || !docType) return
    setUploadingId(docType)
    setError(null)
    try {
      const form = new FormData()
      form.append('type', docType)
      form.append('file', file)
      const res = await fetch(`/api/customer/applications/${applicationId}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.token}` },
        body: form,
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Upload failed')
      load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploadingId(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const allRequiredUploaded = docs?.required.every((d) => d.uploaded) ?? false

  return (
    <div>
      <button className="cp-back" onClick={onBack}>
        ← Back
      </button>
      <div className="cp-step-label">Step 2 of 3 · Documents</div>
      <h1 className="cp-h1">Upload documents</h1>
      <p className="cp-sub">All required documents must be uploaded before you can continue.</p>

      <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={onFileChosen} accept="image/*,.pdf" />

      {docs?.required.map((d) => (
        <div className="cp-doc-row" key={d.id}>
          <div>
            <div className="name">{d.label}</div>
            <div className="hint">{d.hint}</div>
          </div>
          <button className={`cp-doc-upload-btn ${d.uploaded ? 'done' : ''}`} onClick={() => triggerUpload(d.id)} disabled={uploadingId === d.id}>
            {uploadingId === d.id ? 'Uploading…' : d.uploaded ? '✓ Uploaded' : 'Upload'}
          </button>
        </div>
      ))}

      {docs && docs.optional.length > 0 && (
        <>
          <p className="cp-sub" style={{ marginTop: 20, marginBottom: 8 }}>
            Optional (strengthens your application)
          </p>
          {docs.optional.map((d) => (
            <div className="cp-doc-row" key={d.id}>
              <div>
                <div className="name">{d.label}</div>
                <div className="hint">{d.hint}</div>
              </div>
              <button className={`cp-doc-upload-btn ${d.uploaded ? 'done' : ''}`} onClick={() => triggerUpload(d.id)} disabled={uploadingId === d.id}>
                {uploadingId === d.id ? 'Uploading…' : d.uploaded ? '✓ Uploaded' : 'Upload'}
              </button>
            </div>
          ))}
        </>
      )}

      {error && <p className="cp-err">{error}</p>}
      <button className="cp-btn cp-btn-primary" disabled={!allRequiredUploaded} onClick={onDone} style={{ marginTop: 16 }}>
        Continue to Key Fact Statement
      </button>
    </div>
  )
}
