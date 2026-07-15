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
    title: z.string().trim().min(1, "Service title is required").max(200),
    details: z.string().trim().min(1, "Service details are required").max(1000),
    icon: z.string().trim().optional(),
  })
  .strict();

export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(500).optional(),
    title: z.string().trim().min(1).max(200).optional(),
    details: z.string().trim().min(1).max(1000).optional(),
    icon: z.string().trim().optional(),
  })
  .strict();

export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
