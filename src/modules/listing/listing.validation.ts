import { z } from "zod";

const GenericDataSchema = z.record(z.string(), z.unknown()).optional();

/**
 * Preprocessor that accepts a string "true"/"false" or a boolean
 * and normalises it to a boolean.
 * This is needed because multer/multipart form-data sends all fields
 * as strings, so booleans arrive as "true" or "false" from Swagger UI.
 */
const parseBoolean = (val: unknown): unknown => {
  if (typeof val === "boolean") return val;
  if (val === "true") return true;
  if (val === "false") return false;
  return val;
};

const BooleanField = () => z.preprocess(parseBoolean, z.boolean());

export const CreateListingSchema = z.looseObject({
  title: z.string(),
  slug: z.string(),
  serviceId: z.string(),
  description: z.string(),
  addressId: z.string(),
  basePrice: z.string(),
  hourlyPrice: z.string(),
  dailyPrice: z.string(),
  estimatedDuration: z.string(),
  genericData: GenericDataSchema,
  isAvailable: BooleanField(),
});

export type CreateListingInput = z.infer<typeof CreateListingSchema>;

export const UpdateListingSchema = z.looseObject({
  title: z.string().optional(),
  slug: z.string().optional(),
  serviceId: z.string().optional(),
  description: z.string().optional(),
  basePrice: z.string().optional(),
  hourlyPrice: z.string().optional(),
  dailyPrice: z.string().optional(),
  estimatedDuration: z.string().optional(),
  genericData: GenericDataSchema,
});

export type UpdateListingInput = z.infer<typeof UpdateListingSchema>;

export const GetListingsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(10),
    search: z.string().optional(),
    serviceId: z.string().optional(),
    serviceName: z.string().optional(),
    address: z.string().optional(),
    radius: z.coerce.number().positive().max(30).optional(),
    minRating: z.coerce.number().min(1).max(5).optional(),
    isAvailable: z
      .preprocess((val) => {
        if (typeof val === "boolean") return val;
        if (val === "true") return true;
        if (val === "false") return false;
        return undefined;
      }, z.boolean())
      .optional(),
    sortBy: z.string().default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .refine((data) => {
    if (data.radius !== undefined && !data.address) {
      return false;
    }
    return true;
  }, {
    message:
      "Radius requires an address. Please provide the 'address' query parameter when using 'radius'.",
    path: ["radius"],
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
