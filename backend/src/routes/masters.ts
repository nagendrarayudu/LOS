import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireStaff } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { getLoanParameter, getBankParameter, getLoanPolicy, DEFAULT_LOAN_PARAMETER, DEFAULT_BANK_PARAMETER, DEFAULT_LOAN_POLICY } from "../lib/masters.js";

export const mastersRouter = Router();
// Everyone signed in as staff can view masters (needed for read-only context elsewhere in
// the app); only ADMIN can change them.
mastersRouter.use(requireStaff());

function requireAdmin(role: string) {
  if (role !== "ADMIN") throw new HttpError(403, "Only admins can edit masters");
}

// ── Products (schemes) ────────────────────────────────────

const schemeSchema = z.object({
  key: z.string().min(2),
  name: z.string().min(2),
  category: z.enum(["SECURED", "UNSECURED"]),
  repaymentType: z.enum(["REDUCING", "BULLET"]),
  interestRate: z.number().positive(),
  minAmount: z.number().positive(),
  maxAmount: z.number().positive(),
  minTenureMonths: z.number().int().positive(),
  maxTenureMonths: z.number().int().positive(),
  ltvPercent: z.number().positive().optional().nullable(),
  tag: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

mastersRouter.get(
  "/products",
  asyncHandler(async (req, res) => {
    const schemes = await prisma.scheme.findMany({ where: { tenantId: req.staff!.tenantId }, orderBy: { name: "asc" } });
    res.json(schemes);
  })
);

mastersRouter.post(
  "/products",
  asyncHandler(async (req, res) => {
    requireAdmin(req.staff!.role);
    const body = schemeSchema.parse(req.body);
    if (body.maxAmount < body.minAmount) throw new HttpError(400, "maxAmount must be >= minAmount");
    if (body.maxTenureMonths < body.minTenureMonths) throw new HttpError(400, "maxTenureMonths must be >= minTenureMonths");
    const scheme = await prisma.scheme.create({ data: { ...body, tenantId: req.staff!.tenantId } });
    res.status(201).json(scheme);
  })
);

mastersRouter.put(
  "/products/:id",
  asyncHandler(async (req, res) => {
    requireAdmin(req.staff!.role);
    const existing = await prisma.scheme.findFirst({ where: { id: req.params.id, tenantId: req.staff!.tenantId } });
    if (!existing) throw new HttpError(404, "Product not found");
    const body = schemeSchema.partial().parse(req.body);
    const scheme = await prisma.scheme.update({ where: { id: existing.id }, data: body });
    res.json(scheme);
  })
);

mastersRouter.delete(
  "/products/:id",
  asyncHandler(async (req, res) => {
    requireAdmin(req.staff!.role);
    const existing = await prisma.scheme.findFirst({ where: { id: req.params.id, tenantId: req.staff!.tenantId } });
    if (!existing) throw new HttpError(404, "Product not found");
    // Soft delete — schemes may be referenced by existing applications.
    const scheme = await prisma.scheme.update({ where: { id: existing.id }, data: { active: false } });
    res.json(scheme);
  })
);

// ── Loan parameters (singleton per tenant) ────────────────

const loanParameterSchema = z.object({
  processingFeePercent: z.number().min(0).max(100),
  gstPercent: z.number().min(0).max(100),
  penalInterestPercent: z.number().min(0).max(100),
  foreclosurePercent: z.number().min(0).max(100),
  bounceChargeAmount: z.number().min(0),
  lateFeeAmount: z.number().min(0),
  coolingOffDays: z.number().int().min(0),
  moratoriumMonths: z.number().int().min(0),
});

mastersRouter.get(
  "/loan-parameters",
  asyncHandler(async (req, res) => {
    res.json(await getLoanParameter(req.staff!.tenantId));
  })
);

mastersRouter.put(
  "/loan-parameters",
  asyncHandler(async (req, res) => {
    requireAdmin(req.staff!.role);
    const body = loanParameterSchema.parse(req.body);
    const row = await prisma.loanParameter.upsert({
      where: { tenantId: req.staff!.tenantId },
      update: body,
      create: { ...DEFAULT_LOAN_PARAMETER, ...body, tenantId: req.staff!.tenantId },
    });
    res.json(row);
  })
);

// ── Bank parameters (singleton per tenant) ────────────────

const bankParameterSchema = z.object({
  bankName: z.string().min(2),
  cbsCode: z.string().min(1),
  ifscPrefix: z.string().min(1),
  baseRatePercent: z.number().min(0).max(100),
  singleApproverCeiling: z.number().positive(),
  makerCheckerCeiling: z.number().positive(),
  committeeQuorum: z.number().int().positive(),
  committeeSize: z.number().int().positive(),
  neftCutoffTime: z.string().min(1),
  workingDays: z.string().min(1),
});

mastersRouter.get(
  "/bank-parameters",
  asyncHandler(async (req, res) => {
    res.json(await getBankParameter(req.staff!.tenantId));
  })
);

mastersRouter.put(
  "/bank-parameters",
  asyncHandler(async (req, res) => {
    requireAdmin(req.staff!.role);
    const body = bankParameterSchema.parse(req.body);
    if (body.makerCheckerCeiling < body.singleApproverCeiling) {
      throw new HttpError(400, "makerCheckerCeiling must be >= singleApproverCeiling");
    }
    if (body.committeeQuorum > body.committeeSize) {
      throw new HttpError(400, "committeeQuorum cannot exceed committeeSize");
    }
    const row = await prisma.bankParameter.upsert({
      where: { tenantId: req.staff!.tenantId },
      update: body,
      create: { ...DEFAULT_BANK_PARAMETER, ...body, tenantId: req.staff!.tenantId },
    });
    res.json(row);
  })
);

// ── Loan policy (singleton per tenant) ────────────────────

const loanPolicySchema = z.object({
  minAge: z.number().int().min(18).max(100),
  maxAge: z.number().int().min(18).max(100),
  maxDbrPercent: z.number().min(0).max(100),
  defaultMaxLtvPercent: z.number().min(0).max(100),
  minCibilScore: z.number().int().min(300).max(900),
  minCompositeScoreAutoApprove: z.number().int().min(0).max(100),
  requireKyc: z.boolean(),
  blockActiveDefault: z.boolean(),
});

mastersRouter.get(
  "/loan-policy",
  asyncHandler(async (req, res) => {
    res.json(await getLoanPolicy(req.staff!.tenantId));
  })
);

mastersRouter.put(
  "/loan-policy",
  asyncHandler(async (req, res) => {
    requireAdmin(req.staff!.role);
    const body = loanPolicySchema.parse(req.body);
    if (body.maxAge < body.minAge) throw new HttpError(400, "maxAge must be >= minAge");
    const row = await prisma.loanPolicy.upsert({
      where: { tenantId: req.staff!.tenantId },
      update: body,
      create: { ...DEFAULT_LOAN_POLICY, ...body, tenantId: req.staff!.tenantId },
    });
    res.json(row);
  })
);
