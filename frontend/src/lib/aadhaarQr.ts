import jsQR from 'jsqr'

export type AadhaarQrFields = {
  /** Full 12-digit number — only present if the card's QR wasn't masked (older cards). */
  aadhaarNumber?: string
  aadhaarLast4?: string
  name?: string
  dob?: string // yyyy-mm-dd, may be a 1-Jan placeholder if only year-of-birth was present
  gender?: 'Male' | 'Female' | 'Other'
  addressLine1?: string
  city?: string
  state?: string
  pincode?: string
}

export type AadhaarQrResult =
  | { ok: true; fields: AadhaarQrFields }
  | { ok: false; reason: 'no-qr-found' | 'unsupported-format' }

/**
 * Decodes a frame/image and, if it contains an Aadhaar QR, extracts demographic fields.
 *
 * Only the legacy/plain "PrintLetterBarcodeData" XML QR format (found on most physical
 * and older e-Aadhaar cards) is parsed here — it is unsigned-but-plaintext XML embedded
 * directly in the QR, so this is a genuine local decode, not a network call.
 *
 * The newer "Secure QR" format (used on Aadhaar downloaded after ~2019) packs the same
 * data as a signed, compressed binary blob per a separate UIDAI spec; decoding that
 * reliably needs a vetted parser we don't have here, so it's reported as unsupported
 * rather than guessed at.
 */
export function decodeAadhaarQr(imageData: ImageData): AadhaarQrResult {
  const code = jsQR(imageData.data, imageData.width, imageData.height)
  if (!code) return { ok: false, reason: 'no-qr-found' }

  const raw = code.data
  if (raw.includes('<PrintLetterBarcodeData')) {
    return parseLegacyXmlQr(raw)
  }

  // Secure QR payloads are binary/compressed, not valid UTF-8 XML — jsQR still
  // returns *a* string (mis-decoded bytes), so any non-empty, non-XML result here
  // is treated as "found a QR, but not one we can parse."
  return { ok: false, reason: 'unsupported-format' }
}

function parseLegacyXmlQr(xml: string): AadhaarQrResult {
  try {
    const doc = new DOMParser().parseFromString(xml, 'text/xml')
    const el = doc.querySelector('PrintLetterBarcodeData')
    if (!el) return { ok: false, reason: 'unsupported-format' }

    const attr = (name: string) => el.getAttribute(name)?.trim() || undefined

    const uid = attr('uid')
    const uidDigits = uid?.replace(/\D/g, '')
    const name = attr('name')
    const gender = attr('gender')
    const yob = attr('yob')
    const dob = attr('dob')

    const addressParts = [attr('house'), attr('street'), attr('lm'), attr('loc'), attr('vtc'), attr('po'), attr('dist')].filter(Boolean)

    const fields: AadhaarQrFields = {
      // Cards issued after UIDAI's 2018 masking rules only expose the last 4 digits in
      // print/QR (shown as e.g. "XXXXXXXX1234") — only trust a full number if all 12
      // digits are actually present.
      aadhaarNumber: uidDigits && uidDigits.length === 12 ? uidDigits : undefined,
      aadhaarLast4: uidDigits && uidDigits.length >= 4 ? uidDigits.slice(-4) : undefined,
      name,
      gender: gender === 'M' ? 'Male' : gender === 'F' ? 'Female' : gender === 'T' ? 'Other' : undefined,
      dob: normalizeDob(dob, yob),
      addressLine1: addressParts.length ? addressParts.join(', ') : undefined,
      city: attr('vtc'),
      state: attr('state'),
      pincode: attr('pc'),
    }

    return { ok: true, fields }
  } catch {
    return { ok: false, reason: 'unsupported-format' }
  }
}

function normalizeDob(dob: string | undefined, yob: string | undefined): string | undefined {
  // dob attribute is typically DD-MM-YYYY
  if (dob) {
    const m = dob.match(/^(\d{2})-(\d{2})-(\d{4})$/)
    if (m) return `${m[3]}-${m[2]}-${m[1]}`
  }
  if (yob && /^\d{4}$/.test(yob)) return `${yob}-01-01`
  return undefined
}
