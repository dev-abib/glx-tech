/**
 * Fix Missing Feature Definitions & Plan Features
 *
 * The database is missing 4 feature definitions that the seeder defines:
 * - basic_analytics
 * - featured_listing
 * - multiple_locations
 * - priority_support
 *
 * This script creates them and enables the appropriate ones on each plan.
 *
 * How to run:
 *   npx tsx scripts/fix-missing-features.ts
 *
 * Or via npm:
 *   npm run fix:features
 */

import { config } from "dotenv";
config();

import { getPrismaClient } from "../src/config/database.js";

const prisma = getPrismaClient();

// ── The missing feature definitions ──────────────────────────────────────

const MISSING_FEATURES = [
  {
    key: "basic_analytics",
    label: "Basic Analytics",
    description:
      "View basic listing analytics including views and inquiries",
    displayOrder: 1,
  },
  {
    key: "featured_listing",
    label: "Featured Listing",
    description:
      "Get your listings featured on the homepage and search results",
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
] as const;

// ── Which features should be enabled for each plan slug ──────────────────

const PLAN_ENABLED_FEATURES: Record<string, string[]> = {
  free: [
    "basic_analytics",
    "verified_badge",
  ],
  professional: [
    "basic_analytics",
    "multiple_locations",
    "priority_support",
    "verified_badge",
    "bulk_listing",
  ],
  premium: [
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
};

async function fixMissingFeatures(): Promise<void> {
  try {
    await prisma.$connect();
    console.log("[FixFeatures] Connected to database.\n");

    // ── Step 1: Create missing feature definitions ─────────────────
    console.log("═══ Step 1: Creating missing feature definitions ═══");

    let createdCount = 0;
    for (const feature of MISSING_FEATURES) {
      const existing = await prisma.featureDefinition.findUnique({
        where: { key: feature.key },
      });

      if (existing) {
        // Update label/description in case they differ
        await prisma.featureDefinition.update({
          where: { key: feature.key },
          data: {
            label: feature.label,
            description: feature.description,
            displayOrder: feature.displayOrder,
          },
        });
        console.log(`  ~ Updated: ${feature.key} (${feature.label})`);
      } else {
        await prisma.featureDefinition.create({ data: feature });
        console.log(`  + Created: ${feature.key} (${feature.label})`);
        createdCount++;
      }
    }
    console.log(`  Done. ${createdCount} new, ${MISSING_FEATURES.length - createdCount} already exist.\n`);

    // ── Step 2: Enable features on plans ─────────────────────────────
    console.log("═══ Step 2: Enabling features on plans ═══");

    const plans = await prisma.subscriptionPlan.findMany({
      include: { features: true },
    });

    for (const plan of plans) {
      const featuresToEnable = PLAN_ENABLED_FEATURES[plan.slug];

      if (!featuresToEnable) {
        console.log(`  - Skipping unknown plan: ${plan.name} (${plan.slug})`);
        continue;
      }

      let upsertedCount = 0;
      for (const featureKey of featuresToEnable) {
        // First ensure the feature definition exists
        const featureDef = await prisma.featureDefinition.findUnique({
          where: { key: featureKey },
        });

        if (!featureDef) {
          console.warn(
            `    ⚠ Feature definition "${featureKey}" not found — creating it`
          );
          // Find matching entry in MISSING_FEATURES
          const missingFeature = MISSING_FEATURES.find(
            (f) => f.key === featureKey
          );
          if (missingFeature) {
            await prisma.featureDefinition.create({ data: missingFeature });
          }
        }

        // Upsert the plan feature toggle
        await prisma.planFeature.upsert({
          where: {
            planId_key: { planId: plan.id, key: featureKey },
          },
          update: { enabled: true },
          create: {
            planId: plan.id,
            key: featureKey,
            enabled: true,
          },
        });
        upsertedCount++;
      }

      // Also disable features that shouldn't be enabled for this plan
      // (only for the features we manage)
      const existingEnabledFeatures = plan.features
        .filter((f) => f.enabled)
        .map((f) => f.key);

      const allManagedFeatures = [
        ...new Set(Object.values(PLAN_ENABLED_FEATURES).flat()),
      ];

      const toDisable = existingEnabledFeatures.filter(
        (k) =>
          allManagedFeatures.includes(k) && !featuresToEnable.includes(k)
      );

      if (toDisable.length > 0) {
        await prisma.planFeature.updateMany({
          where: {
            planId: plan.id,
            key: { in: toDisable },
          },
          data: { enabled: false },
        });
        console.log(
          `  ${plan.name}: ${upsertedCount} enabled, ${toDisable.length} disabled`
        );
      } else {
        console.log(`  ${plan.name}: ${upsertedCount} features enabled`);
      }
    }

    // ── Summary ─────────────────────────────────────────────────────
    const featureDefCount = await prisma.featureDefinition.count();
    const planFeatureCount = await prisma.planFeature.count({
      where: { enabled: true },
    });

    console.log("\n═══════════════════════════════════════════");
    console.log("  Fix Complete!");
    console.log(`  Feature Definitions: ${featureDefCount}`);
    console.log(`  Enabled Plan Features: ${planFeatureCount}`);
    console.log(`  Missing Features Fixed: ${createdCount}`);
    console.log("═══════════════════════════════════════════\n");

    console.log("Next steps:");
    console.log("  1. The user's Premium plan now has 'multiple_locations' enabled");
    console.log("  2. They can now add multiple addresses");
    console.log("  3. If they still can't add, they may need to refresh their session (re-login)");
    console.log("     or wait for the in-memory cache (30s) to expire.");

  } catch (error) {
    console.error("[FixFeatures] Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log("\n[FixFeatures] Disconnected.");
  }
}

fixMissingFeatures();
