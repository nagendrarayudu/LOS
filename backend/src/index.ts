import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { schemesRouter } from "./routes/schemes.js";
import { customerApplicationsRouter } from "./routes/customerApplications.js";
import { customerProfileRouter } from "./routes/customerProfile.js";
import { staffApplicationsRouter } from "./routes/staffApplications.js";
import { customerDigilockerRouter, digilockerWebhookRouter } from "./routes/digilocker.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "*" }));
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/schemes", schemesRouter);
// Mounted before customerApplicationsRouter: its GET "/:id" would otherwise swallow
// GET "/configured" as if "configured" were an application id.
app.use("/api/customer/applications", customerDigilockerRouter);
app.use("/api/customer/applications", customerApplicationsRouter);
app.use("/api/customer/me", customerProfileRouter);
app.use("/api/staff", staffApplicationsRouter);
app.use("/api/webhooks/signzy", digilockerWebhookRouter);

app.use(errorHandler);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Sahyog LOS backend listening on :${port}`);
});
