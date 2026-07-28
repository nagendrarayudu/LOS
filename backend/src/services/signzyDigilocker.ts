// Signzy DigiLocker consent API — built against the request/response/webhook shapes
// documented at https://api-preproduction.signzy.app/api/v3/digilocker/createUrl
// (preproduction/sandbox base URL; switch SIGNZY_BASE_URL for production).
//
// Flow: createDigilockerUrl() gets a consent URL + requestId -> customer completes
// authentication and consent on DigiLocker's own site -> Signzy POSTs the result to our
// webhook (see routes/digilocker.ts), matched back to our application via `internalId`.

export type DigilockerCreateUrlResult = { url: string; requestId: string };

export type DigilockerDemographics = {
  name?: string;
  dob?: string; // YYYY-MM-DD; omitted if DigiLocker returned a privacy-masked DOB (e.g. "12/10/XXXX")
  gender?: "Male" | "Female" | "Other";
  addressLine1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  aadhaarLast4?: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not configured. Signzy DigiLocker eKYC needs SIGNZY_API_TOKEN, PUBLIC_APP_URL, and PUBLIC_API_URL set in backend/.env ` +
        `(the latter two must be internet-reachable — e.g. an ngrok tunnel in local dev — since Signzy calls your webhook directly).`
    );
  }
  return value;
}

export function isDigilockerConfigured(): boolean {
  return Boolean(process.env.SIGNZY_API_TOKEN && process.env.PUBLIC_APP_URL && process.env.PUBLIC_API_URL);
}

export async function createDigilockerUrl(params: { applicationId: string }): Promise<DigilockerCreateUrlResult> {
  const baseUrl = process.env.SIGNZY_BASE_URL ?? "https://api-preproduction.signzy.app";
  const apiToken = requireEnv("SIGNZY_API_TOKEN");
  const publicAppUrl = requireEnv("PUBLIC_APP_URL");
  const publicApiUrl = requireEnv("PUBLIC_API_URL");

  const res = await fetch(`${baseUrl}/api/v3/digilocker/createUrl`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiToken },
    body: JSON.stringify({
      signup: true,
      callbackUrl: `${publicApiUrl}/api/webhooks/signzy/digilocker`,
      successRedirectUrl: `${publicAppUrl}/apply/app/${params.applicationId}?digilocker=success`,
      successRedirectTime: 5,
      failureRedirectUrl: `${publicAppUrl}/apply/app/${params.applicationId}?digilocker=failure`,
      failureRedirectTime: 5,
      logoVisible: "false",
      docType: ["ADHAR"],
      purpose: "kyc",
      getScope: false,
      internalId: params.applicationId,
      getBase64Files: false,
      getEAadhaarPdf: false,
      getEAadhaarJpeg: false,
    }),
  });

  if (!res.ok) throw new Error(`Signzy createUrl failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { result?: { url?: string; requestId?: string } };
  if (!data.result?.url || !data.result?.requestId) {
    throw new Error("Signzy createUrl response did not include result.url / result.requestId");
  }
  return { url: data.result.url, requestId: data.result.requestId };
}

// dd/mm/yyyy -> yyyy-mm-dd. DigiLocker sometimes masks the year for privacy (e.g.
// "12/10/XXXX") — in that case this deliberately returns undefined rather than a
// half-parsed date, matching the QR-scan path's "don't guess" rule.
function convertDdMmYyyyToIso(dob: unknown): string | undefined {
  if (typeof dob !== "string") return undefined;
  const m = dob.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : undefined;
}

function normalizeGender(gender: unknown): DigilockerDemographics["gender"] {
  const g = String(gender ?? "").toUpperCase();
  if (g === "MALE" || g === "M") return "Male";
  if (g === "FEMALE" || g === "F") return "Female";
  return g ? "Other" : undefined;
}

export type DigilockerCallbackResult = {
  requestId: string;
  internalId: string | null;
  status: string;
  demographics: DigilockerDemographics | null;
};

/** Parses the webhook body Signzy POSTs to callbackUrl once consent completes (or fails). */
export function parseDigilockerCallback(payload: Record<string, unknown>): DigilockerCallbackResult {
  const requestId = String(payload.requestId ?? "");
  const internalId = typeof payload.internalId === "string" ? payload.internalId : null;
  const status = String(payload.status ?? "unknown");

  const aadharDetail = payload.aadharDetail as Record<string, unknown> | undefined;
  if (status !== "success" || !aadharDetail) {
    return { requestId, internalId, status, demographics: null };
  }

  const split = (payload.splitAddress as Record<string, unknown>) ?? {};
  const uid = String(aadharDetail.uid ?? "");
  const cityArr = split.city as string[] | undefined;
  const stateArr = split.state as string[][] | undefined;

  const demographics: DigilockerDemographics = {
    name: typeof aadharDetail.name === "string" ? aadharDetail.name : undefined,
    dob: convertDdMmYyyyToIso(aadharDetail.dob),
    gender: normalizeGender(aadharDetail.gender),
    addressLine1: (split.addressLine as string | undefined) ?? (payload.address as string | undefined),
    city: Array.isArray(cityArr) ? cityArr[0] : undefined,
    state: Array.isArray(stateArr) ? stateArr[0]?.[0] : undefined,
    pincode: typeof split.pincode === "string" ? split.pincode : undefined,
    aadhaarLast4: uid.replace(/\D/g, "").slice(-4) || undefined,
  };

  return { requestId, internalId, status, demographics };
}
