import z from "zod";

// ── Review Section Schemas ────────────────────────────────────────────────

export const createReviewSectionSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    subTitle: z.string().trim().min(1, "Sub-title is required").max(300),
  })
  .strict();

export type CreateReviewSectionInput = z.infer<typeof createReviewSectionSchema>;

export const updateReviewSectionSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    subTitle: z.string().trim().min(1).max(300).optional(),
  })
  .strict();

export type UpdateReviewSectionInput = z.infer<typeof updateReviewSectionSchema>;

// ── Review Schemas ────────────────────────────────────────────────────────

export const createReviewSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    position: z.string().trim().min(1, "Position is required").max(200),
    reviewDate: z.string().trim().min(1, "Review date is required").max(50),
    review: z.string().trim().min(1, "Review text is required").max(5000),
    ratingCount: z.string().trim().min(1, "Rating count is required").max(10),
  })
  .strict();

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    position: z.string().trim().min(1).max(200).optional(),
    reviewDate: z.string().trim().min(1).max(50).optional(),
    review: z.string().trim().min(1).max(5000).optional(),
    ratingCount: z.string().trim().min(1).max(10).optional(),
  })
  .strict();

export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
