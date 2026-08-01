import z from "zod";

/**
 * Login schema for admin / super_admin users.
 * Relaxed password validation (no complex regex) because seeded
 * admin credentials may not meet the strict user password policy.
 */
export const adminLoginSchema = z
  .object({
    email: z.string().trim().email("Invalid email format"),
    password: z.string().min(8).max(128),
  })
  .strict();

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

/**
 * Schema for creating a new admin or super_admin user.
 * Only super_admins can access this endpoint.
 */
export const createAdminSchema = z
  .object({
    name: z.string().trim().min(3).max(100),
    email: z.string().trim().email("Invalid email format"),
    password: z
      .string()
      .min(8)
      .max(128)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()\[\]{}_\-=+|\\:;"'<>,./~`]).+$/,
        "Password must include uppercase, lowercase, number, and special character"
      ),
    confirmPassword: z.string(),
    role: z.enum(["admin", "super_admin"], "Role must be 'admin' or 'super_admin'"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .strict();

export type CreateAdminInput = z.infer<typeof createAdminSchema>;

/**
 * Schema for admin change password.
 */
export const adminChangePasswordSchema = z
  .object({
    oldPassword: z.string().min(8).max(128),
    password: z.string().min(8).max(128),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .strict();

export type AdminChangePasswordInput = z.infer<typeof adminChangePasswordSchema>;

/**
 * Schema for admin updating their own profile.
 * The avatar key is stripped from req.body by the route middleware
 * before validation (multer handles it as req.file).
 */
export const adminUpdateSelfSchema = z
  .object({
    name: z.string().trim().min(3).max(100).optional(),
    email: z.string().trim().email("Invalid email format").optional(),
  })
  .strict();

export type AdminUpdateSelfInput = z.infer<typeof adminUpdateSelfSchema>;

/**
 * Schema for super admin updating a user or admin by ID.
 */
export const adminUpdateUserSchema = z
  .object({
    name: z.string().trim().min(3).max(100).optional(),
    email: z.string().trim().email("Invalid email format").optional(),
    isActive: z.boolean().optional(),
    role: z.enum(["user", "admin", "super_admin"], "Invalid role").optional(),
  })
  .strict();

export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

/**
 * Schema for admin approving/revoking a seller's verified badge.
 */
export const adminSetSellerVerificationSchema = z
  .object({
    isVerifiedSeller: z.boolean(),
  })
  .strict();

export type AdminSetSellerVerificationInput = z.infer<
  typeof adminSetSellerVerificationSchema
>;

/**
 * Schema for admin approving/rejecting a seller's external link.
 */
export const adminSetLinkStatusSchema = z
  .object({
    status: z.enum(["approved", "rejected"]),
  })
  .strict();

export type AdminSetLinkStatusInput = z.infer<typeof adminSetLinkStatusSchema>;
