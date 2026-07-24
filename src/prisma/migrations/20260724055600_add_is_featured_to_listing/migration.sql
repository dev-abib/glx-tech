-- AlterTable: Add isFeatured column to Listing
ALTER TABLE "Listing" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;
