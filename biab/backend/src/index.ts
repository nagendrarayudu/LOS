import "dotenv/config";
import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health.js";
import { glAccountsRouter } from "./routes/glAccounts.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "*" }));
app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/gl-accounts", glAccountsRouter);

app.use(errorHandler);

const port = Number(process.env.PORT ?? 4001);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`BIAB backend listening on :${port}`);
});
