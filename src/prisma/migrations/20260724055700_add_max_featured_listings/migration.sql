-- AlterTable: Add maxFeaturedListings column to subscription_plans
ALTER TABLE "subscription_plans" ADD COLUMN "max_featured_listings" INTEGER NOT NULL DEFAULT 0;
