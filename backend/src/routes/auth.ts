import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";
import { generateOtp, hashOtp, verifyOtp } from "../lib/otp.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";

export const authRouter = Router();

const DEFAULT_TENANT_SLUG = "sahyog";

async function getDefaultTenant() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: DEFAULT_TENANT_SLUG } });
  if (!tenant) throw new HttpError(500, "Default tenant not seeded");
  return tenant;
}

// ── Staff login ──────────────────────────────────────────

const staffLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  "/staff/login",
  asyncHandler(async (req, res) => {
    const { email, password } = staffLoginSchema.parse(req.body);
    const user = await prisma.staffUser.findUnique({ where: { email } });
    if (!user || !user.active) throw new HttpError(401, "Invalid credentials");
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new HttpError(401, "Invalid credentials");

    const token = signToken({ sub: user.id, tenantId: user.tenantId, role: user.role, kind: "staff" });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  })
);

// ── Customer OTP login ───────────────────────────────────

const requestOtpSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
});

authRouter.post(
  "/customer/otp/request",
  asyncHandler(async (req, res) => {
    const { mobile } = requestOtpSchema.parse(req.body);
    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.otpChallenge.create({
      data: { mobile, otpHash, purpose: "LOGIN", expiresAt },
    });

    // No SMS gateway in this build — the demo OTP (123456) always works.
    res.json({ sent: true, expiresAt, demoOtp: process.env.NODE_ENV !== "production" ? "123456" : undefined });
  })
);

const verifyOtpSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/),
  otp: z.string().length(6),
});

authRouter.post(
  "/customer/otp/verify",
  asyncHandler(async (req, res) => {
    const { mobile, otp } = verifyOtpSchema.parse(req.body);

    const challenge = await prisma.otpChallenge.findFirst({
      where: { mobile, purpose: "LOGIN", verifiedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (!challenge) throw new HttpError(400, "No OTP request found, please request a new one");
    if (challenge.expiresAt < new Date()) throw new HttpError(400, "OTP expired, please request a new one");
    if (challenge.attempts >= 5) throw new HttpError(429, "Too many attempts, please request a new OTP");

    const ok = await verifyOtp(otp, challenge.otpHash);
    if (!ok) {
      await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      throw new HttpError(401, "Incorrect OTP");
    }
    await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { verifiedAt: new Date() } });

    const tenant = await getDefaultTenant();
    const customer = await prisma.customer.upsert({
      where: { tenantId_mobile: { tenantId: tenant.id, mobile } },
      update: {},
      create: { tenantId: tenant.id, mobile },
    });

    const token = signToken({ sub: customer.id, tenantId: tenant.id, mobile, kind: "customer" });
    res.json({ token, customer });
  })
);
