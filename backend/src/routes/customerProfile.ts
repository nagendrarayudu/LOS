import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireCustomer } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export const customerProfileRouter = Router();
customerProfileRouter.use(requireCustomer);

customerProfileRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUniqueOrThrow({ where: { id: req.customer!.sub } });
    res.json(customer);
  })
);
