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

  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

  .strict();

export type CreateUserInput = z.infer<typeof createUserSchema>;
