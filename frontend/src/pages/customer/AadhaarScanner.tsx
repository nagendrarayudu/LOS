import { useEffect, useRef, useState } from 'react'
import { decodeAadhaarQr, type AadhaarQrFields } from '../../lib/aadhaarQr'

type Props = {
  onScanned: (fields: AadhaarQrFields) => void
}

export function AadhaarScanner({ onScanned }: Props) {
  const [mode, setMode] = useState<'idle' | 'camera'>('idle')
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    return () => stopCamera()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function startCamera() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      setMode('camera')
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      scanLoop()
    } catch {
      setError('Could not access the camera. You can upload a photo of the QR code instead.')
    }
  }

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setMode('idle')
  }

  function scanLoop() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanLoop)
      return
    }
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const result = decodeAadhaarQr(imageData)
    if (result.ok) {
      stopCamera()
      onScanned(result.fields)
      return
    }
    if (!result.ok && result.reason === 'unsupported-format') {
      stopCamera()
      setError(
        'Found a QR code, but it looks like the newer Aadhaar "Secure QR" format (used on downloaded e-Aadhaar), which auto-fill doesn’t support yet. Please enter your details manually below.'
      )
      return
    }
    rafRef.current = requestAnimationFrame(scanLoop)
  }

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const result = decodeAadhaarQr(imageData)
      if (result.ok) {
        onScanned(result.fields)
      } else if (result.reason === 'unsupported-format') {
        setError(
          'Found a QR code, but it looks like the newer Aadhaar "Secure QR" format (used on downloaded e-Aadhaar), which auto-fill doesn’t support yet. Please enter your details manually below.'
        )
      } else {
        setError('No QR code found in that image. Try a clearer photo, or enter details manually.')
      }
      URL.revokeObjectURL(img.src)
    }
    img.src = URL.createObjectURL(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="cp-field">
      <label className="cp-label">Scan Aadhaar QR code (optional, auto-fills the form below)</label>

      {mode === 'idle' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="cp-btn cp-btn-secondary" style={{ width: 'auto', flex: 1 }} onClick={startCamera}>
            📷 Scan with camera
          </button>
          <button type="button" className="cp-btn cp-btn-secondary" style={{ width: 'auto', flex: 1 }} onClick={() => fileInputRef.current?.click()}>
            Upload QR photo
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onFileChosen} />
        </div>
      )}

      {mode === 'camera' && (
        <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#000' }}>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} muted playsInline style={{ width: '100%', display: 'block' }} />
          <button
            type="button"
            className="cp-btn cp-btn-secondary"
            style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', width: 'auto' }}
            onClick={stopCamera}
          >
            Cancel
          </button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {error && <p className="cp-hint" style={{ color: 'var(--fail)' }}>{error}</p>}
      <p className="cp-hint">Point the camera at the QR code printed on your Aadhaar card, or upload a photo of it.</p>
    </div>
  )
}
