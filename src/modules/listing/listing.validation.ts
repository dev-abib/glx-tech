import { z } from "zod";

const GenericDataSchema = z.record(z.string(), z.unknown()).optional();

export const CreateListingSchema = z.looseObject({
  title: z.string(),
  slug: z.string(),
  serviceId: z.string(),
  description: z.string(),
  address: z.string(),
  days: z.array(z.string()),
  weekend: z.array(z.string()),
  timeSlot: z.array(z.string()),
  basePrice: z.string(),
  hourlyPrice: z.string(),
  dailyPrice: z.string(),
  estimatedDuration: z.string(),
  genericData: GenericDataSchema,
});

export type CreateListingInput = z.infer<typeof CreateListingSchema>;

export const UpdateListingSchema = z.looseObject({
  title: z.string().optional(),
  slug: z.string().optional(),
  serviceId: z.string().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  days: z.array(z.string()).optional(),
  weekend: z.array(z.string()).optional(),
  timeSlot: z.array(z.string()).optional(),
  basePrice: z.string().optional(),
  hourlyPrice: z.string().optional(),
  dailyPrice: z.string().optional(),
  estimatedDuration: z.string().optional(),
  genericData: GenericDataSchema,
});

export type UpdateListingInput = z.infer<typeof UpdateListingSchema>;

export const GetListingsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  search: z.string().optional(),
  serviceId: z.string().optional(),
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type GetListingsQueryInput = z.infer<typeof GetListingsQuerySchema>;

// ── User Review Schemas ──────────────────────────────────────────────────

export const CreateUserReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  review: z.string().trim().min(1, "Review text is required").max(5000),
});

export type CreateUserReviewInput = z.infer<typeof CreateUserReviewSchema>;

export const UpdateUserReviewSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  review: z.string().trim().min(1).max(5000).optional(),
});

export type UpdateUserReviewInput = z.infer<typeof UpdateUserReviewSchema>;
