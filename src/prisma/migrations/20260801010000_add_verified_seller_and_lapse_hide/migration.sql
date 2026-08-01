-- Add admin-approved "verified seller" flag to users
ALTER TABLE "users" ADD COLUMN "is_verified_seller" BOOLEAN NOT NULL DEFAULT false;

-- Track listings auto-hidden by subscription lapse so renewal can restore only those
-- NOTE: the Listing model has no @@map, so the physical table is "Listing".
ALTER TABLE "Listing" ADD COLUMN "is_hidden_by_lapse" BOOLEAN NOT NULL DEFAULT false;
