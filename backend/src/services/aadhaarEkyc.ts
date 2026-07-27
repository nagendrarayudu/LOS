import { seededRandom, randomInRange } from "../lib/seededRandom.js";
import { generateOtp as generateNumericOtp, hashOtp, verifyOtp as compareOtp } from "../lib/otp.js";
import crypto from "node:crypto";

export type AadhaarEkycDemographics = {
  name?: string;
  dob?: string; // YYYY-MM-DD
  gender?: "Male" | "Female" | "Other";
  addressLine1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  aadhaarLast4?: string;
};

export type GenerateOtpResult = {
  providerRef: string;
  otpHash?: string; // only the mock provider needs to remember this locally
  expiresInSeconds: number;
  demoOtp?: string; // surfaced to the frontend only in non-production, mock provider only
};

export type VerifyOtpContext = { otpHash: string | null; aadhaarNumber: string };

export interface AadhaarEkycProvider {
  readonly name: string;
  generateOtp(aadhaarNumber: string): Promise<GenerateOtpResult>;
  verifyOtp(providerRef: string, otp: string, context: VerifyOtpContext): Promise<AadhaarEkycDemographics>;
}

// ── Mock provider ─────────────────────────────────────────
//
// Simulates the exact shape of a real OTP-consent eKYC flow (generate-otp -> user enters
// OTP -> verify-otp -> demographic data) without calling any external vendor. Demographic
// data is synthetic, deterministically derived from the Aadhaar number so the same number
// always returns the same "person" — there is no real UIDAI/vendor call here.

const FIRST_NAMES = ["Aditya", "Priya", "Ravi", "Sunitha", "Karthik", "Meena", "Arjun", "Lakshmi", "Suresh", "Divya"];
const LAST_NAMES = ["Reddy", "Rao", "Sharma", "Naidu", "Iyer", "Prasad", "Varma", "Devi", "Kumar", "Patel"];
const CITIES: Array<{ city: string; state: string; pincode: string }> = [
  { city: "Khammam", state: "Telangana", pincode: "507001" },
  { city: "Wyra", state: "Telangana", pincode: "507165" },
  { city: "Hyderabad", state: "Telangana", pincode: "500001" },
  { city: "Vijayawada", state: "Andhra Pradesh", pincode: "520001" },
];

class MockAadhaarEkycProvider implements AadhaarEkycProvider {
  readonly name = "mock";

  async generateOtp(aadhaarNumber: string): Promise<GenerateOtpResult> {
    const otp = generateNumericOtp();
    const otpHash = await hashOtp(otp);
    return {
      providerRef: `MOCK-${crypto.randomUUID()}`,
      otpHash,
      expiresInSeconds: 600,
      demoOtp: process.env.NODE_ENV !== "production" ? "123456" : undefined,
    };
  }

  async verifyOtp(_providerRef: string, otp: string, context: VerifyOtpContext): Promise<AadhaarEkycDemographics> {
    if (!context.otpHash) throw new Error("No OTP challenge in progress for this reference");
    const ok = await compareOtp(otp, context.otpHash);
    if (!ok) throw new Error("Incorrect OTP");

    const aadhaarNumber = context.aadhaarNumber;
    // Seeded on the Aadhaar number itself (not the per-request providerRef) so the same
    // number consistently returns the same synthetic "person" across separate attempts.
    const rand = seededRandom(`aadhaar-ekyc:${aadhaarNumber}`);
    const first = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
    const place = CITIES[Math.floor(rand() * CITIES.length)];
    const year = randomInRange(rand, 1965, 2002);
    const month = String(randomInRange(rand, 1, 12)).padStart(2, "0");
    const day = String(randomInRange(rand, 1, 28)).padStart(2, "0");

    return {
      name: `${first} ${last}`,
      dob: `${year}-${month}-${day}`,
      gender: rand() > 0.5 ? "Male" : "Female",
      addressLine1: `${randomInRange(rand, 1, 99)}-${randomInRange(rand, 1, 20)}, Main Road`,
      city: place.city,
      state: place.state,
      pincode: place.pincode,
      aadhaarLast4: aadhaarNumber.slice(-4),
    };
  }
}

// ── Vendor provider (Signzy / ScoreMe / similar) ─────────
//
// Generic REST client for the "generate-otp then verify-otp" pattern common to Indian
// Aadhaar eKYC vendors. IMPORTANT: the exact endpoint paths, header names, and response
// field names below are NOT verified against Signzy's or ScoreMe's actual current API
// docs — we don't have access to those. Before relying on this in anything real:
//   1. Get the vendor's current API reference from your account dashboard.
//   2. Fix AADHAAR_EKYC_GENERATE_PATH / AADHAAR_EKYC_VERIFY_PATH and the field names in
//      the request/response bodies below to match exactly.
//   3. Confirm auth header format (some use `Authorization: Bearer`, others a custom
//      `x-api-key` or signed-request scheme).
class VendorAadhaarEkycProvider implements AadhaarEkycProvider {
  readonly name: string;
  private baseUrl: string;
  private apiKey: string;

  constructor(providerName: string) {
    this.name = providerName;
    const baseUrl = process.env.AADHAAR_EKYC_BASE_URL;
    const apiKey = process.env.AADHAAR_EKYC_API_KEY;
    if (!baseUrl || !apiKey) {
      throw new Error(
        `AADHAAR_EKYC_PROVIDER is set to "${providerName}" but AADHAAR_EKYC_BASE_URL / AADHAAR_EKYC_API_KEY are not configured. ` +
          `Set them in backend/.env once you have vendor credentials, or set AADHAAR_EKYC_PROVIDER=mock to use the built-in demo flow.`
      );
    }
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async generateOtp(aadhaarNumber: string): Promise<GenerateOtpResult> {
    const res = await fetch(`${this.baseUrl}/aadhaar/v1/generate-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ aadhaarNumber }),
    });
    if (!res.ok) throw new Error(`${this.name} generate-otp failed: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { referenceId?: string; requestId?: string; expiresIn?: number };
    const providerRef = data.referenceId ?? data.requestId;
    if (!providerRef) throw new Error(`${this.name} generate-otp response did not include a reference id — check the response shape against the vendor's docs`);
    return { providerRef, expiresInSeconds: data.expiresIn ?? 600 };
  }

  async verifyOtp(providerRef: string, otp: string): Promise<AadhaarEkycDemographics> {
    const res = await fetch(`${this.baseUrl}/aadhaar/v1/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ referenceId: providerRef, otp }),
    });
    if (!res.ok) throw new Error(`${this.name} verify-otp failed: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as Record<string, unknown>;
    // Field names below are a best-effort guess at common conventions — confirm against the
    // vendor's actual response shape and adjust.
    return {
      name: data.name as string | undefined,
      dob: data.dob as string | undefined,
      gender: data.gender as AadhaarEkycDemographics["gender"],
      addressLine1: (data.address as string | undefined) ?? (data.addressLine1 as string | undefined),
      city: data.city as string | undefined,
      state: data.state as string | undefined,
      pincode: (data.pincode as string | undefined) ?? (data.pinCode as string | undefined),
      aadhaarLast4: data.aadhaarLast4 as string | undefined,
    };
  }
}

export function getAadhaarEkycProvider(): AadhaarEkycProvider {
  const configured = (process.env.AADHAAR_EKYC_PROVIDER ?? "mock").toLowerCase();
  if (configured === "mock") return new MockAadhaarEkycProvider();
  return new VendorAadhaarEkycProvider(configured);
}
