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
    phone: z
      .string()
      .regex(/^\+?[1-9]\d{7,14}$/, "Invalid phone number")
      .optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

  .strict();

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(3).max(100).optional(),
    email: z.string().trim().email("Invalid email format").optional(),
    phone: z
      .string()
      .regex(/^\+?[1-9]\d{7,14}$/, "Invalid phone number")
      .optional(),
  })
  .strict();

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

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
  })

  .strict();

export type ResendOtpInput = z.infer<typeof resendOtpSchema>;

export const forgotPasswordSchema = z
  .object({
    email: z.string().trim().email("Invalid email format"),
  })

  .strict();

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const refreshTokenSchema = z
  .object({
    refreshToken: z.string().min(1, "Refresh token is required"),
  })

  .strict();

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

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

export const changePasswordSchema = z
  .object({
    oldPassword: z
      .string()
      .min(8)
      .max(128)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()[\]{}\-_=+|\\:;"'<>,./~`]).+$/,
        "Password must include uppercase, lowercase, number, and special character"
      ),
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

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const switchRoleSchema = z.object({}).strict().default({});

export type SwitchRoleInput = z.infer<typeof switchRoleSchema>;

export const updateUserAsSellerSchema = z
  .object({
    storeName: z.string(),
    servicesId: z.array(z.string()),
    insuranceStatus: z.enum(["yes", "no", "not_applicable"]),
    socialLInk: z.string(),
    businessNumber: z.string(),
    businessEmail: z.string(),
    addresses: z
      .array(
        z
          .object({
            streetAddress: z.string(),
            city: z.string(),
            state: z.string(),
            zipCode: z.string(),
          })
          .strict()
      )
      .min(1, "At least one address is required"),
  })

  .strict();

export type UpdateUserAsSellerInput = z.infer<typeof updateUserAsSellerSchema>;

export const updateSellerDetailsSchema = z
  .object({
    storeName: z.string().optional(),
    servicesId: z.array(z.string()).optional(),
    insuranceStatus: z.enum(["yes", "no", "not_applicable"]).optional(),
    socialLInk: z.string().optional(),
    businessNumber: z.string().optional(),
    businessEmail: z.string().email().optional(),
  })
  .strict();

export type UpdateSellerDetailsInput = z.infer<typeof updateSellerDetailsSchema>;

// ── Seller Address CRUD schemas ───────────────────────────────────────────

export const createSellerAddressSchema = z
  .object({
    streetAddress: z.string().min(1, "Street address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    zipCode: z.string().min(1, "Zip code is required"),
  })
  .strict();

export type CreateSellerAddressInput = z.infer<typeof createSellerAddressSchema>;

export const updateSellerAddressSchema = z
  .object({
    streetAddress: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
  })
  .strict();

export type UpdateSellerAddressInput = z.infer<typeof updateSellerAddressSchema>;
