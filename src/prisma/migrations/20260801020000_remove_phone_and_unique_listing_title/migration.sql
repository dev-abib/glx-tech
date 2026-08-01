-- Drop the phone column from users — phone numbers are no longer collected
-- or stored anywhere (privacy: nothing to leak in a data breach).
ALTER TABLE "users" DROP COLUMN IF EXISTS "phone";

-- One seller can only have one listing with a given title — this keeps
-- listing URLs unique per shop and prevents duplicate-named listings.
--
-- Before adding the unique index, rename any existing duplicate
-- (userId, title) rows to "title-<id>" instead of deleting them. Deleting
-- would fail for listings that still have appointments (FK ON DELETE
-- RESTRICT) and would destroy booking history — renaming preserves it.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY "userId", title ORDER BY "created_at", id) AS rn
  FROM "Listing"
)
UPDATE "Listing" a
SET title = a.title || '-' || a.id
FROM ranked r
WHERE a.id = r.id
  AND r.rn > 1;

-- CreateIndex
CREATE UNIQUE INDEX "Listing_userId_title_key" ON "Listing"("userId", "title");
