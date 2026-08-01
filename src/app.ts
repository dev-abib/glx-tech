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
import { ApiError } from "./utils/api-error.js";

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
) => (req: Request, res: Response, next: NextFunction) => void;
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://unpkg.com",
          "https://vercel.live",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
        imgSrc: [
          "'self'",
          "data:",
          "https://unpkg.com",
          "https://validator.swagger.io",
        ],
        fontSrc: ["'self'", "https://unpkg.com", "data:"],
        connectSrc: [
          "'self'",
          "https://unpkg.com",
          "https://glx-tech-pink.vercel.app",
        ],
      },
    },
  })
);

// ── CORS ──────────────────────────────────────────────────────────────────
// Explicitly allow the configured frontends (env-driven) plus localhost during
// development. Credentials are supported so cookie/header auth never silently
// breaks, and preflight (OPTIONS) is handled for the methods/headers the API
// actually uses. Requests without an Origin header (curl, server-to-server)
// are always allowed.
const allowedOrigins = [
  env.FRONTEND_URL,
  env.APP_URL,
  "https://glxtech-seller.vercel.app",
  "https://glx-tech-pink.vercel.app",
  "https://glx-tech-admin-dashboard.vercel.app",
].filter((origin): origin is string => Boolean(origin));

app.use(
  cors({
    origin(origin, callback) {
      // Non-browser requests have no Origin header — allow them.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Allow any localhost origin in development.
      if (
        env.NODE_ENV !== "production" &&
        /^https?:\/\/localhost(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      callback(new ApiError(403, "Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
  })
);

import { stripeWebhook } from "./modules/stripe/stripe.controllers.js";
app.post(
  `${env.API_VERSION}/stripe/webhook`,
  express.raw({ type: "application/json" }),
  stripeWebhook
);

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
