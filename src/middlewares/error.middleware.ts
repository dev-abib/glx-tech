import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error.js";
import { env } from "../config/env.js";

/**
 * Determines if an error is a JSON parse error from body-parser.
 */
const isJsonParseError = (error: Error): boolean => {
  return (
    error instanceof SyntaxError &&
    "body" in error &&
    error.message.includes("JSON")
  );
};

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

  // Handle JSON parse errors from body-parser (e.g. trailing comma, malformed JSON)
  if (isJsonParseError(error)) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON in request body. Please check for syntax errors like trailing commas.",
      ...(env.NODE_ENV === "development" && { detail: error.message }),
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
