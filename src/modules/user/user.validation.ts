import z from "zod";

export const createUserSchema = z
  .object({
    name: z.string().trim().min(3).max(100),
    email: z.string().trim().email("Invalid email format"),
    password: z
      .string()
      .min(8)
      .max(128)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()[\]{}\-_=+|\\:;"'<>,./~`]).+$/,
        "Password must include uppercase, lowercase, number, and special character"
      ),
    confirmPassword: z.string(),
    role: z.enum(["user", "seller"]),
    phone: z.string().regex(/^\+?[1-9]\d{7,14}$/, "Invalid phone number"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

  .strict();

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const verifyUserAccountSchema = z
  .object({
    email: z.string().trim().email("Invalid email format"),
    otp: z.string().length(4),
  })

  .strict();

export type VerifyUserAccountInput = z.infer<typeof verifyUserAccountSchema>;

export const resendOtpSchema = z
  .object({
    email: z.string().trim().email("Invalid email format"),
    otp: z.string().length(4),
  })

  .strict();

export type ResendOtpInput = z.infer<typeof resendOtpSchema>;

export const loginUserSchema = z
  .object({
    email: z.string().trim().email("Invalid email format"),
    password: z
      .string()
      .min(8)
      .max(128)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()[\]{}\-_=+|\\:;"'<>,./~`]).+$/,
        "Password must include uppercase, lowercase, number, and special character"
      ),
  })

  .strict();

export type LoginUserInput = z.infer<typeof loginUserSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8)
      .max(128)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()[\]{}\-_=+|\\:;"'<>,./~`]).+$/,
        "Password must include uppercase, lowercase, number, and special character"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

  .strict();

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
