import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { SCHEME_DOCS, DOC_LIBRARY, type ApplicantType } from "../lib/documents.js";

export const schemesRouter = Router();

schemesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const schemes = await prisma.scheme.findMany({ where: { active: true }, orderBy: { name: "asc" } });
    res.json(schemes);
  })
);

schemesRouter.get(
  "/:key",
  asyncHandler(async (req, res) => {
    const scheme = await prisma.scheme.findFirst({ where: { key: req.params.key, active: true } });
    if (!scheme) return res.status(404).json({ error: "Scheme not found" });
    res.json(scheme);
  })
);

schemesRouter.get(
  "/:key/documents",
  asyncHandler(async (req, res) => {
    const applicantType = (req.query.applicantType as ApplicantType) ?? "INDIVIDUAL";
    const matrix = SCHEME_DOCS[req.params.key]?.[applicantType];
    if (!matrix) return res.status(404).json({ error: "Scheme not found" });
    res.json({
      required: matrix.required.map((id) => DOC_LIBRARY[id]),
      optional: matrix.optional.map((id) => DOC_LIBRARY[id]),
    });
  })
);
