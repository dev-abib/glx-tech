import { NextFunction, Request, Response } from "express";
import { ZodError, ZodSchema } from "zod";
import { ApiError } from "../utils/api-error.js";

/**
 * Express middleware factory that validates `req.body` against a Zod schema.
 *
 * On success, `req.body` is replaced with the parsed (and transformed) output,
 * so downstream handlers receive clean, typed data.
 *
 * On failure, an `ApiError` with status 400 is thrown containing the formatted
 * field-level error messages.
 *
 * @example
 * import { validate } from "../middlewares/validation.middleware.js";
 * import { createUserSchema } from "./user.validation.js";
 *
 * router.post("/users", validate(createUserSchema), handler);
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map(
          (issue) => `${String(issue.path?.join(".") ?? "")}: ${issue.message}`
        );
        next(new ApiError(400, messages.join("; ")));
        return;
      }
      next(error);
    }
  };
};
