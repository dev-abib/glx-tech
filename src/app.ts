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

// Helmet v8 type resolution workaround for Vercel (Linux) build
// TypeScript 6.0.3 on Linux resolves helmet's types as module namespace
// instead of a callable function due to missing "types" condition in
// helmet's exports map. We use a local type assertion to bypass this.
import helmetModule from "helmet";
import type { Request, NextFunction } from "express";
const helmet = helmetModule as unknown as (
  options?: Record<string, unknown>
) => (req: Request, res: Response, next: NextFunction) => void;

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(cors());
app.use(express.json());

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

app.use(env.API_VERSION, allRoutes);

app.use(notFoundMiddleware);

app.use(errorMiddleware);

export default app;
