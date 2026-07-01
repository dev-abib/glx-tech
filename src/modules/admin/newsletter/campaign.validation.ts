import z from "zod";

/**
 * Schema for creating a campaign draft.
 */
export const createCampaignSchema = z
  .object({
    subject: z.string().trim().min(1, "Subject is required").max(200),
    heading: z.string().trim().min(1, "Heading is required").max(200),
    bodyHtml: z.string().min(1, "Body HTML is required"),
    ctaText: z.string().trim().max(100).optional().nullable(),
    ctaLink: z.string().trim().url("Invalid CTA link").max(500).optional().nullable(),
  })
  .strict();

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

/**
 * Schema for subscribing to the newsletter.
 */
export const subscribeSchema = z
  .object({
    email: z.string().trim().email("Invalid email format"),
  })
  .strict();

export type SubscribeInput = z.infer<typeof subscribeSchema>;
