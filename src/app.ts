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
import helmetModule from "helmet";
import type { Request, NextFunction } from "express";
const helmet = helmetModule as unknown as (
  options?: Record<string, unknown>
) => (req: Request, res: Response, next: NextFunction) => void;

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://vercel.live"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
        imgSrc: ["'self'", "data:", "https://unpkg.com"],
        fontSrc: ["'self'", "https://unpkg.com", "data:"],
        connectSrc: ["'self'", "https://unpkg.com"],
      },
    },
  })
);

app.use(cors());
app.use(express.json());

// ── Static Assets (favicon, etc.) ─────────────────────────────────────────
app.use(express.static("public"));

app.use(morgan("dev"));
app.use(compression());
app.use(cookieParser());
app.use(
  express.urlencoded({
    extended: true,
  })
);


app.get("/health", (_req, res: Response) => {
  res.send("system is up");
});

// ── Favicon ────────────────────────────────────────────────────────────────
app.get("/favicon.ico", (_req, res: Response) => {
  res.sendFile("favicon.svg", { root: "public" });
});



// ── Swagger Routes ────────────────────────────────────────────────────────
app.use(swaggerRoutes);

// ── API Routes ─────────────────────────────────────────────────────────────
app.use(env.API_VERSION, allRoutes);

app.use(notFoundMiddleware);

app.use(errorMiddleware);

export default app;
