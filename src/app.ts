import express, { Application, Response } from "express";
const app: Application = express();
import cors from "cors";

import allRoutes from "./routes/index.js";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import compression from "compression";
import { notFoundMiddleware } from "./middlewares/not-found.middleware.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { env } from "./config/env.js";

// ── Swagger ────────────────────────────────────────────────────────────────
import swaggerRoutes from "./routes/swagger.route.js";
import { getSystemReport } from "./modules/system/system.controller.js";
import helmetModule from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import type { Request, NextFunction } from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const helmet = helmetModule as unknown as (
  options?: Record<string, unknown>
) => (req: Request, res: Response, next: NextFunction) => void;app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://vercel.live"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
        imgSrc: ["'self'", "data:", "https://unpkg.com", "https://validator.swagger.io"],
        fontSrc: ["'self'", "https://unpkg.com", "data:"],
        connectSrc: ["'self'", "https://unpkg.com", "https://glx-tech-pink.vercel.app"],
      },
    },
  })
);

app.use(cors());

// ── Stripe Webhook ─────────────────────────────────────────────────────────
// Stripe webhook needs the raw request body for signature verification.
// This must be registered BEFORE express.json() so the raw body is preserved.
import { stripeWebhook } from "./modules/stripe/stripe.controllers.js";
app.post(`${env.API_VERSION}/stripe/webhook`, express.raw({ type: "application/json" }), stripeWebhook);

app.use(express.json());

// ── Static Assets (favicon, etc.) ─────────────────────────────────────────
const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

app.use(morgan("dev"));
app.use(compression());
app.use(cookieParser());
app.use(
  express.urlencoded({
    extended: true,
  })
);


// System health report (also available at /api/v1/health)
app.get("/health", getSystemReport);

// ── Swagger Routes ────────────────────────────────────────────────────────
app.use(swaggerRoutes);

// ── API Routes ─────────────────────────────────────────────────────────────
app.use(env.API_VERSION, allRoutes);

app.use(notFoundMiddleware);

app.use(errorMiddleware);

export default app;
