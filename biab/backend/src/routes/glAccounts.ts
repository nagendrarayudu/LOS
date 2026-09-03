import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export const glAccountsRouter = Router();

glAccountsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const accounts = await prisma.gLAccount.findMany({ orderBy: { code: "asc" } });
    res.json(accounts);
  })
);
