import { Router } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { requireCustomer } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { repaymentSummary } from "../lib/loanMath.js";
import { SCHEME_DOCS, DOC_LIBRARY } from "../lib/documents.js";
import { generateApplicationNumber } from "../lib/applicationNumber.js";
import { upload } from "../lib/upload.js";
import { runCreditAssessment } from "../services/creditScore.js";
import { getAadhaarEkycProvider } from "../services/aadhaarEkyc.js";

export const customerApplicationsRouter = Router();
customerApplicationsRouter.use(requireCustomer);

async function loadOwnedApplication(id: string, customerId: string) {
  const application = await prisma.loanApplication.findUnique({
    where: { id },
    include: { scheme: true, documents: true, statusEvents: { orderBy: { createdAt: "asc" } } },
  });
  if (!application || application.customerId !== customerId) throw new HttpError(404, "Application not found");
  return application;
}

// ── Create / list ────────────────────────────────────────

const createSchema = z.object({
  schemeKey: z.string(),
  requestedAmount: z.number().positive(),
  tenureMonths: z.number().int().positive(),
  applicantType: z.enum(["INDIVIDUAL", "ENTERPRISE"]).default("INDIVIDUAL"),
});

customerApplicationsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const scheme = await prisma.scheme.findFirst({ where: { key: body.schemeKey, tenantId: req.customer!.tenantId, active: true } });
    if (!scheme) throw new HttpError(404, "Scheme not found");
    if (body.requestedAmount < Number(scheme.minAmount) || body.requestedAmount > Number(scheme.maxAmount)) {
      throw new HttpError(400, `Amount must be between ${scheme.minAmount} and ${scheme.maxAmount}`);
    }
    if (body.tenureMonths < scheme.minTenureMonths || body.tenureMonths > scheme.maxTenureMonths) {
      throw new HttpError(400, `Tenure must be between ${scheme.minTenureMonths} and ${scheme.maxTenureMonths} months`);
    }

    const summary = repaymentSummary(body.requestedAmount, Number(scheme.interestRate), body.tenureMonths, scheme.repaymentType);

    const application = await prisma.loanApplication.create({
      data: {
        applicationNumber: `DRAFT-${crypto.randomUUID().slice(0, 8)}`,
        tenantId: req.customer!.tenantId,
        customerId: req.customer!.sub,
        schemeId: scheme.id,
        applicantType: body.applicantType,
        requestedAmount: body.requestedAmount,
        tenureMonths: body.tenureMonths,
        emi: summary.emi,
        aprPercent: summary.aprPercent,
        processingFeeAmount: summary.processingFeeAmount,
        totalInterest: summary.totalInterest,
        totalPayable: summary.totalPayable,
        netDisbursedAmount: summary.netDisbursedAmount,
      },
      include: { scheme: true },
    });
    res.status(201).json(application);
  })
);

customerApplicationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const applications = await prisma.loanApplication.findMany({
      where: { customerId: req.customer!.sub },
      include: { scheme: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(applications);
  })
);

customerApplicationsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const application = await loadOwnedApplication(req.params.id, req.customer!.sub);
    res.json(application);
  })
);

// ── KYC ───────────────────────────────────────────────────

const kycSchema = z.object({
  name: z.string().min(2),
  dob: z.string(),
  gender: z.enum(["Male", "Female", "Other"]),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN format"),
  aadhaarNumber: z.string().regex(/^\d{12}$/, "Aadhaar must be 12 digits"),
  addressLine1: z.string().min(3),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().regex(/^\d{6}$/),
  occupation: z.string().min(2),
  employer: z.string().min(2),
  netIncome: z.number().positive(),
});

customerApplicationsRouter.put(
  "/:id/kyc",
  asyncHandler(async (req, res) => {
    const application = await loadOwnedApplication(req.params.id, req.customer!.sub);
    if (application.status !== "DRAFT") throw new HttpError(400, "KYC can only be updated while application is a draft");
    const body = kycSchema.parse(req.body);

    const customer = await prisma.customer.update({
      where: { id: req.customer!.sub },
      data: {
        name: body.name,
        dob: new Date(body.dob),
        gender: body.gender,
        panNumber: body.panNumber,
        panVerifiedAt: new Date(),
        aadhaarLast4: body.aadhaarNumber.slice(-4),
        aadhaarVerifiedAt: new Date(),
        addressLine1: body.addressLine1,
        city: body.city,
        state: body.state,
        pincode: body.pincode,
        occupation: body.occupation,
        employer: body.employer,
        netIncome: body.netIncome,
        kycVerifiedAt: new Date(),
      },
    });
    res.json(customer);
  })
);

// ── Aadhaar OTP-consent eKYC ──────────────────────────────
// Mirrors the generate-otp / verify-otp pattern used by Aadhaar eKYC vendors (Signzy,
// ScoreMe, etc). Which provider actually runs is chosen by AADHAAR_EKYC_PROVIDER in
// backend/.env — "mock" (default) needs no credentials; a real vendor name requires
// AADHAAR_EKYC_BASE_URL / AADHAAR_EKYC_API_KEY, see services/aadhaarEkyc.ts.

const aadhaarOtpRequestSchema = z.object({
  aadhaarNumber: z.string().regex(/^\d{12}$/, "Aadhaar must be 12 digits"),
});

customerApplicationsRouter.post(
  "/:id/aadhaar-ekyc/otp",
  asyncHandler(async (req, res) => {
    const application = await loadOwnedApplication(req.params.id, req.customer!.sub);
    if (application.status !== "DRAFT") throw new HttpError(400, "KYC can only be updated while application is a draft");
    const { aadhaarNumber } = aadhaarOtpRequestSchema.parse(req.body);

    const provider = getAadhaarEkycProvider();
    const result = await provider.generateOtp(aadhaarNumber);

    await prisma.aadhaarEkycChallenge.create({
      data: {
        applicationId: application.id,
        aadhaarNumber,
        provider: provider.name,
        providerRef: result.providerRef,
        otpHash: result.otpHash,
        expiresAt: new Date(Date.now() + result.expiresInSeconds * 1000),
      },
    });

    res.json({ providerRef: result.providerRef, demoOtp: result.demoOtp });
  })
);

const aadhaarOtpVerifySchema = z.object({
  providerRef: z.string(),
  otp: z.string().min(4).max(8),
});

customerApplicationsRouter.post(
  "/:id/aadhaar-ekyc/verify",
  asyncHandler(async (req, res) => {
    const application = await loadOwnedApplication(req.params.id, req.customer!.sub);
    if (application.status !== "DRAFT") throw new HttpError(400, "KYC can only be updated while application is a draft");
    const { providerRef, otp } = aadhaarOtpVerifySchema.parse(req.body);

    const challenge = await prisma.aadhaarEkycChallenge.findFirst({
      where: { applicationId: application.id, providerRef, verifiedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (!challenge) throw new HttpError(400, "No eKYC OTP request found, please request a new one");
    if (challenge.expiresAt < new Date()) throw new HttpError(400, "OTP expired, please request a new one");
    if (challenge.attempts >= 5) throw new HttpError(429, "Too many attempts, please request a new OTP");

    const provider = getAadhaarEkycProvider();
    let demographics;
    try {
      demographics = await provider.verifyOtp(providerRef, otp, { otpHash: challenge.otpHash, aadhaarNumber: challenge.aadhaarNumber });
    } catch (e) {
      await prisma.aadhaarEkycChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      throw new HttpError(401, e instanceof Error ? e.message : "OTP verification failed");
    }

    await prisma.aadhaarEkycChallenge.update({
      where: { id: challenge.id },
      data: { verifiedAt: new Date(), resultJson: demographics as never },
    });

    res.json(demographics);
  })
);

// ── Loan terms / eligibility ─────────────────────────────

const termsSchema = z.object({
  requestedAmount: z.number().positive(),
  tenureMonths: z.number().int().positive(),
  collateralValue: z.number().positive().optional(),
});

customerApplicationsRouter.put(
  "/:id/terms",
  asyncHandler(async (req, res) => {
    const application = await loadOwnedApplication(req.params.id, req.customer!.sub);
    if (application.status !== "DRAFT") throw new HttpError(400, "Terms can only be updated while application is a draft");
    const body = termsSchema.parse(req.body);
    const scheme = application.scheme;

    if (body.requestedAmount < Number(scheme.minAmount) || body.requestedAmount > Number(scheme.maxAmount)) {
      throw new HttpError(400, `Amount must be between ${scheme.minAmount} and ${scheme.maxAmount}`);
    }
    if (body.tenureMonths < scheme.minTenureMonths || body.tenureMonths > scheme.maxTenureMonths) {
      throw new HttpError(400, `Tenure must be between ${scheme.minTenureMonths} and ${scheme.maxTenureMonths} months`);
    }

    const summary = repaymentSummary(body.requestedAmount, Number(scheme.interestRate), body.tenureMonths, scheme.repaymentType);

    const updated = await prisma.loanApplication.update({
      where: { id: application.id },
      data: {
        requestedAmount: body.requestedAmount,
        tenureMonths: body.tenureMonths,
        collateralValue: body.collateralValue,
        emi: summary.emi,
        aprPercent: summary.aprPercent,
        processingFeeAmount: summary.processingFeeAmount,
        totalInterest: summary.totalInterest,
        totalPayable: summary.totalPayable,
        netDisbursedAmount: summary.netDisbursedAmount,
      },
      include: { scheme: true },
    });
    res.json(updated);
  })
);

// ── Required documents ───────────────────────────────────

customerApplicationsRouter.get(
  "/:id/documents/required",
  asyncHandler(async (req, res) => {
    const application = await loadOwnedApplication(req.params.id, req.customer!.sub);
    const matrix = SCHEME_DOCS[application.scheme.key]?.[application.applicantType] ?? { required: [], optional: [] };
    const uploadedTypes = new Set(application.documents.map((d) => d.type));
    const describe = (id: string) => ({ ...DOC_LIBRARY[id], uploaded: uploadedTypes.has(id) });
    res.json({
      required: matrix.required.map(describe),
      optional: matrix.optional.map(describe),
    });
  })
);

// ── Document upload ──────────────────────────────────────

customerApplicationsRouter.post(
  "/:id/documents",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const application = await loadOwnedApplication(req.params.id, req.customer!.sub);
    if (application.status !== "DRAFT" && application.status !== "DOCS_PENDING") {
      throw new HttpError(400, "Documents cannot be uploaded in the current application status");
    }
    const docType = String(req.body.type ?? "");
    if (!DOC_LIBRARY[docType]) throw new HttpError(400, "Unknown document type");
    if (!req.file) throw new HttpError(400, "File is required");

    const existing = await prisma.document.findFirst({ where: { applicationId: application.id, type: docType } });
    if (existing) await prisma.document.delete({ where: { id: existing.id } });

    const doc = await prisma.document.create({
      data: {
        applicationId: application.id,
        type: docType,
        fileName: req.file.originalname,
        fileUrl: `/uploads/${req.file.filename}`,
      },
    });
    res.status(201).json(doc);
  })
);

// ── Submit (KFS acceptance + finalize) ───────────────────

const submitSchema = z.object({
  acceptKfs: z.literal(true),
  acceptTerms: z.literal(true),
});

customerApplicationsRouter.post(
  "/:id/submit",
  asyncHandler(async (req, res) => {
    const application = await loadOwnedApplication(req.params.id, req.customer!.sub);
    if (application.status !== "DRAFT") throw new HttpError(400, "Application already submitted");
    submitSchema.parse(req.body);

    const customer = await prisma.customer.findUniqueOrThrow({ where: { id: req.customer!.sub } });
    if (!customer.kycVerifiedAt) throw new HttpError(400, "Complete KYC before submitting");

    const matrix = SCHEME_DOCS[application.scheme.key]?.[application.applicantType] ?? { required: [], optional: [] };
    const uploadedTypes = new Set(application.documents.map((d) => d.type));
    const missing = matrix.required.filter((id) => !uploadedTypes.has(id));
    if (missing.length > 0) throw new HttpError(400, `Missing required documents: ${missing.join(", ")}`);

    let applicationNumber = generateApplicationNumber();
    for (let i = 0; i < 5; i++) {
      const clash = await prisma.loanApplication.findUnique({ where: { applicationNumber } });
      if (!clash) break;
      applicationNumber = generateApplicationNumber();
    }

    const branches = ["Khammam Main", "Wyra"];
    const branch = branches[Math.floor(Math.random() * branches.length)];

    await prisma.$transaction([
      prisma.loanApplication.update({
        where: { id: application.id },
        data: {
          applicationNumber,
          status: "NEW_LEAD",
          submittedAt: new Date(),
          kfsAcceptedAt: new Date(),
          branch,
        },
      }),
      prisma.applicationStatusEvent.create({
        data: { applicationId: application.id, status: "NEW_LEAD", note: "Application submitted via customer portal" },
      }),
    ]);

    await runCreditAssessment(application.id);

    const final = await prisma.loanApplication.findUniqueOrThrow({
      where: { id: application.id },
      include: { scheme: true, documents: true, statusEvents: { orderBy: { createdAt: "asc" } } },
    });
    res.json(final);
  })
);
