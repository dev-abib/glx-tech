import z from "zod";

// ── Hero Schemas ──────────────────────────────────────────────────────────

export const createHeroSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200).optional(),
    sub_title: z
      .string()
      .trim()
      .min(1, "Sub-title is required")
      .max(300)
      .optional(),
    highlighted_txt: z.string().trim().max(200).optional(),
  })
  .strict();

export type CreateHeroInput = z.infer<typeof createHeroSchema>;

export const updateHeroSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    sub_title: z.string().trim().min(1).max(300).optional(),
    highlighted_txt: z.string().trim().max(200).optional(),
  })
  .strict();

export type UpdateHeroInput = z.infer<typeof updateHeroSchema>;

// ── Service Schemas ───────────────────────────────────────────────────────

export const createServiceSchema = z
  .object({
    name: z.string().trim().min(1, "Service name is required").max(100),
    description: z.string().trim().max(500).optional(),
    icon: z.string().trim().optional(),
  })
  .strict();

export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(500).optional(),
    icon: z.string().trim().optional(),
  })
  .strict();

export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

// ── Contact Inquiry Schemas ───────────────────────────────────────────────

export const createContactSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    email: z.string().trim().email("Valid email is required"),
    phone: z.string().trim().max(30).optional(),
    subject: z.string().trim().max(200).optional(),
    message: z.string().trim().min(1, "Message is required").max(5000),
  })
  .strict();

export type CreateContactInput = z.infer<typeof createContactSchema>;

export const replyContactSchema = z
  .object({
    replyMessage: z
      .string()
      .trim()
      .min(1, "Reply message is required")
      .max(5000),
  })
  .strict();

export type ReplyContactInput = z.infer<typeof replyContactSchema>;

// ── About Us Schemas ──────────────────────────────────────────────────────

export const createAboutSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(300),
    description: z.string().trim().min(1, "Description is required").max(10000),
  })
  .strict();

export type CreateAboutInput = z.infer<typeof createAboutSchema>;

export const updateAboutSchema = z
  .object({
    title: z.string().trim().min(1).max(300).optional(),
    description: z.string().trim().min(1).max(10000).optional(),
  })
  .strict();

export type UpdateAboutInput = z.infer<typeof updateAboutSchema>;
