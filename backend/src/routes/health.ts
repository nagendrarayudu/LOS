import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({ status: "ok", service: "sahyog-los-backend", time: new Date().toISOString() });
});
