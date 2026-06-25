import { NextFunction, Request, Response } from "express";
import { AuthHelper } from "../helpers/auth-helpers.js";
import { ApiError } from "../utils/api-error.js";

type AuthRole = "user" | "seller" | "admin" | "super_admin" | "reset";

export interface AuthPayload {
  id: string;
  email: string;
  name: string;
  role: "user" | "seller" | "admin" | "super_admin";
  isPaid: boolean;
  iat?: number;
  exp?: number;
}

interface AuthOptions {
  type?: AuthRole;
}

/**
 * Express authentication middleware factory.
 *
 * Creates middleware that extracts and verifies a JWT from the
 * Authorization header (Bearer token) or the `accessToken` cookie,
 * then attaches the decoded payload to `req.user`.
 *
 * @example
 * // Protect a route for regular users (also allows sellers)
 * router.get("/profile", authenticate(), handler);
 *
 * // Require seller access
 * router.get("/seller/dashboard", authenticate({ type: "seller" }), handler);
 *
 * // Require admin access
 * router.get("/admin/dashboard", authenticate({ type: "admin" }), handler);
 *
 * // Require super admin access
 * router.delete("/admin/users/:id", authenticate({ type: "super_admin" }), handler);
 *
 */

export const authenticate = (options: AuthOptions = {}) => {
  const authHelper = new AuthHelper();

  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const token = extractToken(req);

      if (!token) {
        throw new ApiError(401, "Missing access token");
      }

      const authType = options.type ?? "user";

      const decoded = authHelper.verifyToken(
        token,
        authType,
        "access"
      ) as AuthPayload;

      if (!isValidPayload(decoded)) {
        throw new ApiError(401, "Malformed token payload");
      }

      // Role-based access checks
      if (
        authType === "admin" &&
        !["admin", "super_admin"].includes(decoded.role)
      ) {
        throw new ApiError(401, "Admin access required");
      }
      if (authType === "super_admin" && decoded.role !== "super_admin") {
        throw new ApiError(401, "Super admin access required");
      }
      if (
        authType === "user" &&
        decoded.role !== "user" &&
        decoded.role !== "seller"
      ) {
        throw new ApiError(401, "User access required");
      }
      if (authType === "seller" && decoded.role !== "seller") {
        throw new ApiError(401, "Seller access required");
      }
      req.user = decoded;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Extracts a JWT from the Authorization header (Bearer) or accessToken cookie.
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const [type, token] = authHeader.split(" ");
    if (type === "Bearer" && token) return token;
  }

  const tokenFromCookie =
    typeof req.cookies?.accessToken === "string"
      ? req.cookies.accessToken
      : null;
  if (tokenFromCookie) return tokenFromCookie;

  return null;
}

/**
 * Minimal validation that the decoded payload has the expected shape.
 */
function isValidPayload(value: unknown): value is AuthPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "email" in value &&
    "name" in value &&
    "role" in value
  );
}
