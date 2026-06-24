import bcrypt from "bcrypt";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { createHash } from "crypto";
import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";

type AuthRole = "user" | "seller" | "admin" | "reset" | "super_admin";
type TokenKind = "access" | "refresh";

export class AuthHelper {
  async comparePassword(
    password: string,
    hashPassword: string
  ): Promise<boolean> {
    return await bcrypt.compare(password, hashPassword);
  }

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }

  env(value: string | undefined, name: string): string {
    if (!value) {
      throw new Error(`Missing env: ${name}`);
    }
    return value;
  }

  getJwtConfig(
    type: AuthRole,
    token: TokenKind
  ): { secret: string; expiresIn: SignOptions["expiresIn"] } {
    switch (type) {
      case "user":
      case "seller":
        return {
          secret:
            token === "access"
              ? this.env(env.JWT_ACCESS_SECRET, "JWT_ACCESS_SECRET")
              : this.env(env.JWT_REFRESH_SECRET, "JWT_REFRESH_SECRET"),
          expiresIn:
            token === "access"
              ? (this.env(
                  env.JWT_ACCESS_EXPIRES_IN,
                  "JWT_ACCESS_EXPIRES_IN"
                ) as SignOptions["expiresIn"])
              : (this.env(
                  env.JWT_REFRESH_EXPIRES_IN,
                  "JWT_REFRESH_EXPIRES_IN"
                ) as SignOptions["expiresIn"]),
        };

      case "admin":
      case "super_admin":
        return {
          secret:
            token === "access"
              ? this.env(env.JWT_ADMIN_SECRET, "JWT_ADMIN_SECRET")
              : this.env(
                  env.JWT_ADMIN_REFRESH_SECRET,
                  "JWT_ADMIN_REFRESH_SECRET"
                ),
          expiresIn:
            token === "access"
              ? (this.env(
                  env.JWT_ADMIN_EXPIRES_IN,
                  "JWT_ADMIN_EXPIRES_IN"
                ) as SignOptions["expiresIn"])
              : (this.env(
                  env.JWT_ADMIN_REFRESH_EXPIRES_IN,
                  "JWT_ADMIN_REFRESH_EXPIRES_IN"
                ) as SignOptions["expiresIn"]),
        };

      case "reset":
      default:
        return {
          secret: this.env(env.JWT_RESET_SECRET, "JWT_RESET_SECRET"),
          expiresIn: this.env(
            env.JWT_RESET_EXPIRES_IN,
            "JWT_RESET_EXPIRES_IN"
          ) as SignOptions["expiresIn"],
        };
    }
  }

  generateToken(
    payload: JwtPayload,
    userType: AuthRole,
    tokenType: TokenKind
  ): string {
    const config = this.getJwtConfig(userType, tokenType);
    return jwt.sign(payload, config.secret, { expiresIn: config.expiresIn });
  }

  verifyToken(token: string, type: AuthRole, tokenType: TokenKind): JwtPayload {
    const config = this.getJwtConfig(type, tokenType);
    try {
      return jwt.verify(token, config.secret) as JwtPayload;
    } catch {
      throw new ApiError(401, "Invalid or expired token.");
    }
  }

  hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
