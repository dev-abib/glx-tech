/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Listing` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
-- Clean up any duplicate slugs before adding the unique constraint
DELETE FROM "Listing" a USING (
  SELECT MIN(ctid) as ctid, slug
    FROM "Listing"
    GROUP BY slug
    HAVING COUNT(*) > 1
) b
WHERE a.slug = b.slug
  AND a.ctid <> b.ctid;

-- CreateIndex
CREATE UNIQUE INDEX "Listing_slug_key" ON "Listing"("slug");
