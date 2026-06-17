import express, { Application, Response, Request } from "express";
const app: Application = express();
import cors from "cors";

import allRoutes from "./routes/index.js";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import helmet from "helmet";
import compression from "compression";
import { notFoundMiddleware } from "./middlewares/not-found.middleware.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { env } from "./config/env.js";

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

app.get("/health", (req: Request, res: Response) => {
  res.send("system is up");
});

app.use(env.API_VERSION, allRoutes);

app.use(notFoundMiddleware);

app.use(errorMiddleware);

export default app;
