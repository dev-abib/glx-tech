import { z } from "zod";

const GenericDataSchema = z.record(z.string(), z.unknown()).optional();

/**
 * Preprocessor that accepts either an array of strings or a string
 * (JSON-encoded or comma-separated) and normalises it to an array.
 * This is needed because multer/multipart form-data sends all fields
 * as strings, so array fields arrive as plain strings from Swagger UI.
 */
const parseStringToArray = (val: unknown): unknown => {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    // Try JSON-parsed array first
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // not JSON — fall through
    }
    // Comma-separated fallback
    return val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return val;
};

const ArrayField = () => z.preprocess(parseStringToArray, z.array(z.string()));
const ArrayFieldOptional = () =>
  z.preprocess(parseStringToArray, z.array(z.string()).optional());

export const CreateListingSchema = z.looseObject({
  title: z.string(),
  slug: z.string(),
  serviceId: z.string(),
  description: z.string(),
  address: z.string(),
  days: ArrayField(),
  weekend: ArrayField(),
  timeSlot: ArrayField(),
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
  days: ArrayFieldOptional(),
  weekend: ArrayFieldOptional(),
  timeSlot: ArrayFieldOptional(),
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
