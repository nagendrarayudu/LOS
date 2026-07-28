import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireCustomer } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { createDigilockerUrl, isDigilockerConfigured, parseDigilockerCallback } from "../services/signzyDigilocker.js";

// ── Customer-facing: start + poll ─────────────────────────

export const customerDigilockerRouter = Router();
customerDigilockerRouter.use(requireCustomer);

customerDigilockerRouter.get(
  "/configured",
  asyncHandler(async (_req, res) => {
    res.json({ configured: isDigilockerConfigured() });
  })
);

customerDigilockerRouter.post(
  "/:id/digilocker/start",
  asyncHandler(async (req, res) => {
    const application = await prisma.loanApplication.findUnique({ where: { id: req.params.id } });
    if (!application || application.customerId !== req.customer!.sub) throw new HttpError(404, "Application not found");
    if (application.status !== "DRAFT") throw new HttpError(400, "KYC can only be updated while application is a draft");

    let created: { url: string; requestId: string };
    try {
      created = await createDigilockerUrl({ applicationId: application.id });
    } catch (e) {
      // Config/vendor errors here are actionable for whoever runs this deployment
      // (missing env vars, Signzy rejecting the request) — surface the real message
      // instead of a generic 500. The /configured check should keep this option
      // hidden in the common case, so reaching here at all is itself unexpected.
      throw new HttpError(503, e instanceof Error ? e.message : "DigiLocker verification is currently unavailable");
    }

    await prisma.digilockerRequest.create({
      data: { applicationId: application.id, requestId: created.requestId },
    });

    res.json(created);
  })
);

customerDigilockerRouter.get(
  "/:id/digilocker/status",
  asyncHandler(async (req, res) => {
    const application = await prisma.loanApplication.findUnique({ where: { id: req.params.id } });
    if (!application || application.customerId !== req.customer!.sub) throw new HttpError(404, "Application not found");

    const latest = await prisma.digilockerRequest.findFirst({
      where: { applicationId: application.id },
      orderBy: { createdAt: "desc" },
    });
    if (!latest) return res.json({ status: "none" });

    res.json({ status: latest.status, demographics: latest.status === "success" ? latest.resultJson : null });
  })
);

// ── Signzy webhook (public — Signzy calls this server-to-server, no customer session) ──

export const digilockerWebhookRouter = Router();

digilockerWebhookRouter.post(
  "/digilocker",
  asyncHandler(async (req, res) => {
    const parsed = parseDigilockerCallback(req.body);
    if (!parsed.requestId) {
      // Don't 400 — Signzy doesn't need to know we couldn't match it, and retries on
      // non-2xx could otherwise loop forever on a payload shape we'll never accept.
      // eslint-disable-next-line no-console
      console.error("Signzy DigiLocker webhook missing requestId", req.body);
      return res.json({ received: true });
    }

    await prisma.digilockerRequest.updateMany({
      where: { requestId: parsed.requestId },
      data: {
        status: parsed.status,
        resultJson: parsed.demographics as never,
        completedAt: new Date(),
      },
    });

    res.json({ received: true });
  })
);
