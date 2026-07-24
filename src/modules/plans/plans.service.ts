import { getPrismaClient } from "../../config/database.js";
import { ApiError } from "../../utils/api-error.js";
import { stripe } from "../../config/stripe.config.js";
import type {
  CreatePlanInput,
  UpdatePlanInput,
  BulkSetPlanFeaturesInput,
  CreateFeatureDefinitionInput,
  UpdateFeatureDefinitionInput,
  PlanQueryInput,
} from "./plans.validation.js";

const prisma = getPrismaClient();

// ── Subscription Plan Service ────────────────────────────────────────────

export class PlansService {
  // ── Admin: Create Plan (also creates Stripe Product + Prices) ──────────

  async createPlan(data: CreatePlanInput) {
    // Check slug uniqueness
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { slug: data.slug },
    });
    if (existing) {
      throw new ApiError(409, `A plan with slug "${data.slug}" already exists`);
    }

    // Create Stripe Product + Prices
    let stripePriceIdMonthly: string | null = null;
    let stripePriceIdAnnual: string | null = null;

    try {
      const product = await stripe.products.create({
        name: data.name,
        description: data.description ?? undefined,
      });

      if (data.priceMonthly > 0) {
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: data.priceMonthly,
          currency: "usd",
          recurring: { interval: "month" },
        });
        stripePriceIdMonthly = price.id;
      }

      if (data.priceAnnual > 0) {
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: data.priceAnnual,
          currency: "usd",
          recurring: { interval: "year" },
        });
        stripePriceIdAnnual = price.id;
      }
    } catch (err) {
      // If Stripe fails, we still create the plan locally but without Stripe IDs
      console.error("[PlansService] Stripe product/price creation failed:", err);
    }

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        priceMonthly: data.priceMonthly,
        priceAnnual: data.priceAnnual,
        stripePriceIdMonthly,
        stripePriceIdAnnual,
        maxActiveListings: data.maxActiveListings,
        maxFeaturedListings: data.maxFeaturedListings,
        platformFeePercent: data.platformFeePercent,
        isActive: data.isActive,
        isPublic: data.isPublic,
        displayOrder: data.displayOrder,
      },
      include: {
        features: true,
      },
    });

    // Auto-create plan features from all existing feature definitions (default disabled)
    const featureDefs = await prisma.featureDefinition.findMany({
      orderBy: { displayOrder: "asc" },
    });

    if (featureDefs.length > 0) {
      await prisma.planFeature.createMany({
        data: featureDefs.map((fd) => ({
          planId: plan.id,
          key: fd.key,
          enabled: false,
        })),
        skipDuplicates: true,
      });

      // Re-fetch to include features
      return prisma.subscriptionPlan.findUnique({
        where: { id: plan.id },
        include: { features: true },
      });
    }

    return plan;
  }

  // ── Admin: List All Plans ──────────────────────────────────────────────

  async getAllPlans(query: PlanQueryInput) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [plans, total] = await Promise.all([
      prisma.subscriptionPlan.findMany({
        skip,
        take: limit,
        orderBy: { displayOrder: "asc" },
        include: {
          features: true,
          _count: { select: { users: true } },
        },
      }),
      prisma.subscriptionPlan.count(),
    ]);

    return {
      plans,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Admin: Get Single Plan ─────────────────────────────────────────────

  async getPlanById(id: string) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        features: true,
        _count: { select: { users: true } },
      },
    });

    if (!plan) {
      throw new ApiError(404, "Plan not found");
    }

    return plan;
  }

  // ── Admin: Update Plan ─────────────────────────────────────────────────

  async updatePlan(id: string, data: UpdatePlanInput) {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new ApiError(404, "Plan not found");
    }

    // If price changed, create NEW Stripe prices (Stripe prices are immutable)
    let stripePriceIdMonthly = plan.stripePriceIdMonthly;
    let stripePriceIdAnnual = plan.stripePriceIdAnnual;

    try {
      if (data.priceMonthly !== undefined && data.priceMonthly !== plan.priceMonthly && data.priceMonthly > 0) {
        // Find or create a product first
        const productId = plan.stripePriceIdMonthly
          ? (await stripe.prices.retrieve(plan.stripePriceIdMonthly).catch(() => null))?.product
          : null;

        // Get product ID from existing price or create new product
        let product: string;
        if (productId && typeof productId === "string") {
          product = productId;
        } else if (plan.stripePriceIdAnnual) {
          const existingPrice = await stripe.prices.retrieve(plan.stripePriceIdAnnual).catch(() => null);
          product = (existingPrice?.product as string) || (await stripe.products.create({ name: data.name || plan.name })).id;
        } else {
          product = (await stripe.products.create({ name: data.name || plan.name })).id;
        }

        const price = await stripe.prices.create({
          product,
          unit_amount: data.priceMonthly,
          currency: "usd",
          recurring: { interval: "month" },
        });
        stripePriceIdMonthly = price.id;
      }

      if (data.priceAnnual !== undefined && data.priceAnnual !== plan.priceAnnual && data.priceAnnual > 0) {
        // Similar logic for annual price
        const productId = plan.stripePriceIdAnnual
          ? (await stripe.prices.retrieve(plan.stripePriceIdAnnual).catch(() => null))?.product
          : null;

        let product: string;
        if (productId && typeof productId === "string") {
          product = productId;
        } else if (stripePriceIdMonthly) {
          const existingPrice = await stripe.prices.retrieve(stripePriceIdMonthly).catch(() => null);
          product = (existingPrice?.product as string) || (await stripe.products.create({ name: data.name || plan.name })).id;
        } else {
          product = (await stripe.products.create({ name: data.name || plan.name })).id;
        }

        const price = await stripe.prices.create({
          product,
          unit_amount: data.priceAnnual,
          currency: "usd",
          recurring: { interval: "year" },
        });
        stripePriceIdAnnual = price.id;
      }
    } catch (err) {
      console.error("[PlansService] Stripe price update failed:", err);
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.priceMonthly !== undefined) updateData.priceMonthly = data.priceMonthly;
    if (data.priceAnnual !== undefined) updateData.priceAnnual = data.priceAnnual;
    if (stripePriceIdMonthly !== plan.stripePriceIdMonthly) updateData.stripePriceIdMonthly = stripePriceIdMonthly;
    if (stripePriceIdAnnual !== plan.stripePriceIdAnnual) updateData.stripePriceIdAnnual = stripePriceIdAnnual;
    if (data.maxActiveListings !== undefined) updateData.maxActiveListings = data.maxActiveListings;
    if (data.maxFeaturedListings !== undefined) updateData.maxFeaturedListings = data.maxFeaturedListings;
    if (data.platformFeePercent !== undefined) updateData.platformFeePercent = data.platformFeePercent;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;
    if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;

    return prisma.subscriptionPlan.update({
      where: { id },
      data: updateData,
      include: {
        features: true,
        _count: { select: { users: true } },
      },
    });
  }

  // ── Admin: Soft Delete Plan (set isActive=false) ────────────────────────

  async deletePlan(id: string) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!plan) {
      throw new ApiError(404, "Plan not found");
    }

    // Block hard delete if users are currently on this plan
    if (plan._count.users > 0) {
      // Soft delete instead
      return prisma.subscriptionPlan.update({
        where: { id },
        data: { isActive: false },
      });
    }

    // Hard delete if no users
    await prisma.planFeature.deleteMany({ where: { planId: id } });
    await prisma.subscriptionPlan.delete({ where: { id } });

    return { message: "Plan deleted permanently" };
  }

  // ── Admin: Bulk Set Plan Features ──────────────────────────────────────

  async setPlanFeatures(planId: string, data: BulkSetPlanFeaturesInput) {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new ApiError(404, "Plan not found");
    }

    // Upsert each feature toggle
    for (const feature of data.features) {
      await prisma.planFeature.upsert({
        where: {
          planId_key: { planId, key: feature.key },
        },
        update: { enabled: feature.enabled },
        create: {
          planId,
          key: feature.key,
          enabled: feature.enabled,
        },
      });
    }

    // Return updated plan with features
    return prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      include: { features: true },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FEATURE DEFINITIONS
  // ══════════════════════════════════════════════════════════════════════════

  async getAllFeatureDefinitions() {
    return prisma.featureDefinition.findMany({
      orderBy: { displayOrder: "asc" },
    });
  }

  async createFeatureDefinition(data: CreateFeatureDefinitionInput) {
    const existing = await prisma.featureDefinition.findUnique({
      where: { key: data.key },
    });
    if (existing) {
      throw new ApiError(409, `Feature definition with key "${data.key}" already exists`);
    }

    return prisma.featureDefinition.create({ data });
  }

  async updateFeatureDefinition(id: number, data: UpdateFeatureDefinitionInput) {
    const existing = await prisma.featureDefinition.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, "Feature definition not found");
    }

    return prisma.featureDefinition.update({
      where: { id },
      data,
    });
  }

  async deleteFeatureDefinition(id: number) {
    const existing = await prisma.featureDefinition.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, "Feature definition not found");
    }

    // Also clean up plan feature toggles referencing this key
    await prisma.planFeature.deleteMany({ where: { key: existing.key } });
    await prisma.featureDefinition.delete({ where: { id } });

    return { message: "Feature definition deleted" };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC ENDPOINTS
  // ══════════════════════════════════════════════════════════════════════════

  async getPublicPlans() {
    const plans = await prisma.subscriptionPlan.findMany({
      where: {
        isActive: true,
        isPublic: true,
      },
      orderBy: { displayOrder: "asc" },
      include: {
        features: {
          where: { enabled: true },
          select: { key: true },
        },
      },
    });

    // Also get all feature definitions with labels for the response
    const featureDefs = await prisma.featureDefinition.findMany({
      orderBy: { displayOrder: "asc" },
    });

    return {
      plans: plans.map(({ features, ...plan }) => ({
        ...plan,
        enabledFeatureKeys: features.map((f) => f.key),
      })),
      featureDefinitions: featureDefs,
    };
  }
}
