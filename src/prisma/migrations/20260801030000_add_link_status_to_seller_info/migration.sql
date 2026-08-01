-- Add moderation state for seller external links.
-- Existing sellers keep their current links live (backfilled to "approved"),
-- new/changed links will start as "pending" until an admin approves them.
ALTER TABLE "SellerInfo" ADD COLUMN "link_status" TEXT NOT NULL DEFAULT 'pending';

UPDATE "SellerInfo" SET "link_status" = 'approved' WHERE "socialLInk" IS NOT NULL AND "socialLInk" <> '';
