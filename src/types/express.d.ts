import "express";
import type { AuthPayload } from "../middlewares/auth.middleware.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}
