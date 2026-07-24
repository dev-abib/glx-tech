import { config } from "dotenv";
config();

import { getPrismaClient } from "../config/database.js";
import { stripe } from "../config/stripe.config.js";

const prisma = getPrismaClient();

// ── Feature Definitions ──────────────────────────────────────────────────

interface FeatureDefSeed {
  key: string;
  label: string;
  description: string;
  displayOrder: number;
}

const FEATURE_DEFS: FeatureDefSeed[] = [
  {
    key: "basic_analytics",
    label: "Basic Analytics",
    description: "View basic listing analytics including views and inquiries",
    displayOrder: 1,
  },
  {
    key: "featured_listing",
    label: "Featured Listing",
    description: "Get your listings featured on the homepage and search results",
    displayOrder: 2,
  },
  {
    key: "multiple_locations",
    label: "Multiple Locations",
    description: "List your services in multiple cities or locations",
    displayOrder: 3,
  },
  {
    key: "priority_support",
    label: "Priority Support",
    description: "Priority customer support with faster response times",
    displayOrder: 4,
  },
  {
    key: "custom_branding",
    label: "Custom Branding",
    description: "Add your own branding and custom styles to listings",
    displayOrder: 5,
  },
  {
    key: "api_access",
    label: "API Access",
    description: "REST API access for third-party integrations",
    displayOrder: 6,
  },
  {
    key: "verified_badge",
    label: "Verified Badge",
    description: "Get a verified seller badge on your profile and listings",
    displayOrder: 7,
  },
  {
    key: "bulk_listing",
    label: "Bulk Listing",
    description: "Upload and manage listings in bulk via CSV/Excel",
    displayOrder: 8,
  },
  {
    key: "advanced_analytics",
    label: "Advanced Analytics",
    description: "Detailed analytics dashboard with exportable reports",
    displayOrder: 9,
  },
  {
    key: "dedicated_manager",
    label: "Dedicated Manager",
    description: "A dedicated account manager to help grow your business",
    displayOrder: 10,
  },
];

// ── Plan Definitions ─────────────────────────────────────────────────────

interface PlanSeed {
  name: string;
  slug: string;
  description: string;
  priceMonthly: number; // cents
  priceAnnual: number; // cents
  maxActiveListings: number;
  maxFeaturedListings: number;
  platformFeePercent: number;
  isPublic: boolean;
  displayOrder: number;
  enabledFeatures: string[]; // feature keys to enable
}

const PLANS: PlanSeed[] = [
  {
    name: "Free",
    slug: "free",
    description: "Perfect for getting started. List your first service and explore the marketplace.",
    priceMonthly: 0,
    priceAnnual: 0,
    maxActiveListings: 1,
    maxFeaturedListings: 0,
    platformFeePercent: 5,
    isPublic: true,
    displayOrder: 1,
    enabledFeatures: ["basic_analytics", "verified_badge"],
  },
  {
    name: "Professional",
    slug: "professional",
    description: "For growing businesses. Unlock more listings and premium features to stand out.",
    priceMonthly: 2999, // $29.99
    priceAnnual: 29999, // $299.99
    maxActiveListings: 10,
    maxFeaturedListings: 3,
    platformFeePercent: 2,
    isPublic: true,
    displayOrder: 2,
    enabledFeatures: [
      "basic_analytics",
      "featured_listing",
      "multiple_locations",
      "priority_support",
      "verified_badge",
      "bulk_listing",
    ],
  },
  {
    name: "Premium",
    slug: "premium",
    description: "The ultimate package for established businesses. Everything included with zero platform fees.",
    priceMonthly: 7999, // $79.99
    priceAnnual: 79999, // $799.99
    maxActiveListings: 50,
    maxFeaturedListings: 10,
    platformFeePercent: 0,
    isPublic: true,
    displayOrder: 3,
    enabledFeatures: [
      "basic_analytics",
      "featured_listing",
      "multiple_locations",
      "priority_support",
      "custom_branding",
      "api_access",
      "verified_badge",
      "bulk_listing",
      "advanced_analytics",
      "dedicated_manager",
    ],
  },
];

// ── Main Seeder ──────────────────────────────────────────────────────────

async function seedPlans(): Promise<void> {
  try {
    await prisma.$connect();
    console.log("[PlansSeeder] Connected to database.");

    // ── 1. Seed Feature Definitions ─────────────────────────────────
    console.log("\n[PlansSeeder] Seeding feature definitions...");

    let seededFeatureCount = 0;
    for (const fd of FEATURE_DEFS) {
      const existing = await prisma.featureDefinition.findUnique({
        where: { key: fd.key },
      });

      if (existing) {
        // Update description/label in case it changed
        await prisma.featureDefinition.update({
          where: { key: fd.key },
          data: {
            label: fd.label,
            description: fd.description,
            displayOrder: fd.displayOrder,
          },
        });
        console.log(`  ~ Updated: ${fd.key} (${fd.label})`);
      } else {
        await prisma.featureDefinition.create({ data: fd });
        console.log(`  + Created: ${fd.key} (${fd.label})`);
        seededFeatureCount++;
      }
    }

    console.log(`  Done. ${seededFeatureCount} new, ${FEATURE_DEFS.length - seededFeatureCount} already exist.`);

    // ── 2. Seed Subscription Plans ──────────────────────────────────
    console.log("\n[PlansSeeder] Seeding subscription plans...");

    for (const planData of PLANS) {
      const existing = await prisma.subscriptionPlan.findUnique({
        where: { slug: planData.slug },
        include: { features: true },
      });

      if (existing) {
        console.log(`  ~ Skipping "${planData.name}" — already exists.`);

        // Ensure all feature definitions have a PlanFeature record
        const existingKeys = new Set(existing.features.map((f) => f.key));
        const missingKeys = FEATURE_DEFS.filter(
          (fd) => !existingKeys.has(fd.key)
        );
        if (missingKeys.length > 0) {
          await prisma.planFeature.createMany({
            data: missingKeys.map((fd) => ({
              planId: existing.id,
              key: fd.key,
              enabled: planData.enabledFeatures.includes(fd.key),
            })),
          });
          console.log(`    Created ${missingKeys.length} new feature toggles.`);
        }

        // Upsert enabled features (ensures they are toggled on)
        if (planData.enabledFeatures.length > 0) {
          for (const featureKey of planData.enabledFeatures) {
            await prisma.planFeature.upsert({
              where: {
                planId_key: { planId: existing.id, key: featureKey },
              },
              update: { enabled: true },
              create: {
                planId: existing.id,
                key: featureKey,
                enabled: true,
              },
            });
          }
        }

        // Disable features that are no longer in the enabled list
        const existingEnabled = existing.features
          .filter((f) => f.enabled)
          .map((f) => f.key);

        const toDisable = existingEnabled.filter(
          (k) => !planData.enabledFeatures.includes(k)
        );
        if (toDisable.length > 0) {
          await prisma.planFeature.updateMany({
            where: {
              planId: existing.id,
              key: { in: toDisable },
            },
            data: { enabled: false },
          });
          console.log(`    Updated features: ${toDisable.length} toggled off.`);
        }

        // Also update plan metadata in case seeder values changed
        await prisma.subscriptionPlan.update({
          where: { id: existing.id },
          data: {
            name: planData.name,
            description: planData.description,
            priceMonthly: planData.priceMonthly,
            priceAnnual: planData.priceAnnual,
            maxActiveListings: planData.maxActiveListings,
            maxFeaturedListings: planData.maxFeaturedListings,
            platformFeePercent: planData.platformFeePercent,
            isPublic: planData.isPublic,
            displayOrder: planData.displayOrder,
          },
        });
        continue;
      }

      // Create Stripe Product + Prices (if price > 0 and Stripe is configured)
      let stripePriceIdMonthly: string | null = null;
      let stripePriceIdAnnual: string | null = null;

      try {
        if (stripe) {
          const product = await stripe.products.create({
            name: planData.name,
            description: planData.description,
          });

          if (planData.priceMonthly > 0) {
            const price = await stripe.prices.create({
              product: product.id,
              unit_amount: planData.priceMonthly,
              currency: "usd",
              recurring: { interval: "month" },
            });
            stripePriceIdMonthly = price.id;
          }

          if (planData.priceAnnual > 0) {
            const price = await stripe.prices.create({
              product: product.id,
              unit_amount: planData.priceAnnual,
              currency: "usd",
              recurring: { interval: "year" },
            });
            stripePriceIdAnnual = price.id;
          }

          console.log(`  [Stripe] Created product "${planData.name}" with prices.`);
        }
      } catch (err) {
        console.warn(
          `  [Stripe] Warning: Could not create Stripe product for "${planData.name}":`,
          err instanceof Error ? err.message : String(err)
        );
        console.log("  [Stripe] Plan will be created without Stripe IDs.");
      }

      // Create the plan in the database
      const plan = await prisma.subscriptionPlan.create({
        data: {
          name: planData.name,
          slug: planData.slug,
          description: planData.description,
          priceMonthly: planData.priceMonthly,
          priceAnnual: planData.priceAnnual,
          stripePriceIdMonthly,
          stripePriceIdAnnual,
          maxActiveListings: planData.maxActiveListings,
          maxFeaturedListings: planData.maxFeaturedListings,
          platformFeePercent: planData.platformFeePercent,
          isActive: true,
          isPublic: planData.isPublic,
          displayOrder: planData.displayOrder,
        },
      });

      // Create feature toggles for this plan
      if (FEATURE_DEFS.length > 0) {
        await prisma.planFeature.createMany({
          data: FEATURE_DEFS.map((fd) => ({
            planId: plan.id,
            key: fd.key,
            enabled: planData.enabledFeatures.includes(fd.key),
          })),
        });
      }

      console.log(`  + Created plan: "${planData.name}" (${planData.slug})`);
      console.log(
        `    Pricing: $${(planData.priceMonthly / 100).toFixed(2)}/mo or $${(planData.priceAnnual / 100).toFixed(2)}/yr`
      );
      console.log(`    Listings: ${planData.maxActiveListings} | Fee: ${planData.platformFeePercent}%`);
      console.log(
        `    Features: ${planData.enabledFeatures.length}/${FEATURE_DEFS.length} enabled`
      );
    }

    // ── Summary ─────────────────────────────────────────────────────
    const planCount = await prisma.subscriptionPlan.count();
    const featureDefCount = await prisma.featureDefinition.count();
    const featureToggleCount = await prisma.planFeature.count();

    console.log("\n═══════════════════════════════════════════");
    console.log("  Plans Seeded Successfully!");
    console.log(`  Plans:              ${planCount}`);
    console.log(`  Feature Definitions: ${featureDefCount}`);
    console.log(`  Feature Toggles:    ${featureToggleCount}`);
    console.log("═══════════════════════════════════════════\n");
  } catch (error) {
    console.error("[PlansSeeder] Error seeding plans:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log("[PlansSeeder] Disconnected from database.");
  }
}

seedPlans();
