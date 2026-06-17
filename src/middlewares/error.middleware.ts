import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error.js";
import { env } from "../config/env.js";

export const errorMiddleware = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  console.error("⚠️ Unhandled Error:", error);

  const isDev = env.NODE_ENV === "development";

  return res.status(500).json({
    success: false,
    message: isDev ? error.message : "Internal Server Error",
    ...(isDev && { stack: error.stack }),
  });
};
