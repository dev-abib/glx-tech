import z from "zod";

// ── Site Settings Schemas ─────────────────────────────────────────────────

export const createSiteSettingsSchema = z
  .object({
    title: z.string().trim().max(200).optional(),
    subTitle: z.string().trim().max(300).optional(),
    footerTxt: z.string().trim().max(1000).optional(),
    siteLink: z.string().trim().url("Must be a valid URL").max(500).optional(),
    location: z.string().trim().max(500).optional(),
    phone: z.string().trim().max(30).optional(),
    email: z.string().trim().email("Must be a valid email").optional(),
  })
  .strict();

export type CreateSiteSettingsInput = z.infer<typeof createSiteSettingsSchema>;

export const updateSiteSettingsSchema = z
  .object({
    title: z.string().trim().max(200).optional(),
    subTitle: z.string().trim().max(300).optional(),
    footerTxt: z.string().trim().max(1000).optional(),
    siteLink: z.string().trim().url("Must be a valid URL").max(500).optional(),
    location: z.string().trim().max(500).optional(),
    phone: z.string().trim().max(30).optional(),
    email: z.string().trim().email("Must be a valid email").optional(),
  })
  .strict();

export type UpdateSiteSettingsInput = z.infer<typeof updateSiteSettingsSchema>;

// ── Social Schemas ────────────────────────────────────────────────────────

export const createSocialSchema = z
  .object({
    socialLink: z
      .string()
      .trim()
      .min(1, "Social link is required")
      .url("Must be a valid URL")
      .max(500),
    icon: z.string().trim().optional(),
  })
  .strict();

export type CreateSocialInput = z.infer<typeof createSocialSchema>;

export const updateSocialSchema = z
  .object({
    socialLink: z
      .string()
      .trim()
      .min(1)
      .url("Must be a valid URL")
      .max(500)
      .optional(),
    icon: z.string().trim().optional(),
  })
  .strict();

export type UpdateSocialInput = z.infer<typeof updateSocialSchema>;
