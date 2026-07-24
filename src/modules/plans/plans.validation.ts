import { z } from "zod";

// ── Subscription Plan Validation ─────────────────────────────────────────

export const CreatePlanSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  slug: z.string().trim().min(1, "Slug is required").max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
  description: z.string().trim().max(500).optional().nullable(),
  priceMonthly: z.number().int().min(0, "Price must be >= 0"),
  priceAnnual: z.number().int().min(0, "Price must be >= 0"),
  maxActiveListings: z.number().int().min(0).default(0),
  maxFeaturedListings: z.number().int().min(0).default(0),
  platformFeePercent: z.number().min(0).max(100).default(0),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
});

export type CreatePlanInput = z.infer<typeof CreatePlanSchema>;

export const UpdatePlanSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  priceMonthly: z.number().int().min(0).optional(),
  priceAnnual: z.number().int().min(0).optional(),
  maxActiveListings: z.number().int().min(0).optional(),
  maxFeaturedListings: z.number().int().min(0).optional(),
  platformFeePercent: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
});

export type UpdatePlanInput = z.infer<typeof UpdatePlanSchema>;

export const BulkSetPlanFeaturesSchema = z.object({
  features: z.array(
    z.object({
      key: z.string().min(1),
      enabled: z.boolean(),
    })
  ),
});

export type BulkSetPlanFeaturesInput = z.infer<typeof BulkSetPlanFeaturesSchema>;

// ── Feature Definition Validation ────────────────────────────────────────

export const CreateFeatureDefinitionSchema = z.object({
  key: z.string().trim().min(1).max(100).regex(/^[a-z_]+$/, "Key must be lowercase with underscores"),
  label: z.string().trim().min(1, "Label is required").max(200),
  description: z.string().trim().max(500).optional().nullable(),
  displayOrder: z.number().int().default(0),
});

export type CreateFeatureDefinitionInput = z.infer<typeof CreateFeatureDefinitionSchema>;

export const UpdateFeatureDefinitionSchema = z.object({
  label: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  displayOrder: z.number().int().optional(),
});

export type UpdateFeatureDefinitionInput = z.infer<typeof UpdateFeatureDefinitionSchema>;

// ── Plan Query Params ────────────────────────────────────────────────────

export const PlanQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export type PlanQueryInput = z.infer<typeof PlanQuerySchema>;
