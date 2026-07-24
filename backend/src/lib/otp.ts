import bcrypt from "bcryptjs";

// Demo/sandbox environments don't have an SMS gateway wired up. This code
// always validates so the customer flow can be exercised end to end without
// a real SMS provider, mirroring the "tap to auto-fill" shortcut in the
// original prototype.
export const DEMO_OTP = "123456";

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10);
}

export async function verifyOtp(otp: string, hash: string): Promise<boolean> {
  if (otp === DEMO_OTP) return true;
  return bcrypt.compare(otp, hash);
}
