import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.js";
import { ensureMeiliIndexes } from "./lib/meili.js";
import { ensureBucket } from "./lib/s3.js";
import { setIo } from "./lib/socket.js";
import { startWorkers } from "./queues/index.js";
import { authRouter } from "./routes/auth.js";
import { tenantsRouter } from "./routes/tenants.js";
import { customersRouter } from "./routes/customers.js";
import { remindersRouter } from "./routes/reminders.js";
import { quotesRouter } from "./routes/quotes.js";
import { publicRouter } from "./routes/public.js";
import { whatsappRouter } from "./routes/whatsapp.js";
import { googleRouter } from "./routes/google.js";
import { aiRouter } from "./routes/ai.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { adminRouter } from "./routes/admin.js";
import {
  metricsMiddleware,
  renderPrometheusMetrics,
} from "./lib/metrics.js";

const app = express();
const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: { origin: env.CORS_ORIGIN, credentials: true },
});
setIo(io);

io.on("connection", (socket) => {
  socket.on("join-tenant", (tenantId: string) => {
    if (tenantId) socket.join(`tenant:${tenantId}`);
  });
});

app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "2mb" }));
app.use(metricsMiddleware);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ai-assistant-api", ts: new Date().toISOString() });
});

app.get("/metrics", (_req, res) => {
  res.type("text/plain").send(renderPrometheusMetrics());
});

app.use("/api/v1/auth", authLimiter, authRouter);
app.use("/api/v1/whatsapp", whatsappRouter); // webhook before auth on some routes
app.use("/api/v1", apiLimiter);
app.use("/api/v1/tenants", tenantsRouter);
app.use("/api/v1/customers", customersRouter);
app.use("/api/v1/reminders", remindersRouter);
app.use("/api/v1/quotes", quotesRouter);
app.use("/api/v1/public", publicRouter);
app.use("/api/v1/google", googleRouter);
app.use("/api/v1/ai", aiRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/admin", adminRouter);

app.use(errorHandler);

async function boot() {
  await ensureMeiliIndexes();
  await ensureBucket();
  startWorkers();

  httpServer.listen(env.API_PORT, () => {
    console.log(`API listening on http://localhost:${env.API_PORT}`);
  });
}

boot().catch((err) => {
  console.error("Failed to boot API", err);
  process.exit(1);
});
