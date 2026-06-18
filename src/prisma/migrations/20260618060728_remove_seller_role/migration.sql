-- Clean up any leftover type from a previous failed attempt (safe to re-run)
DROP TYPE IF EXISTS "Role_new";

-- Convert existing seller users to user before altering the enum
UPDATE "users"
SET "role" = 'user'::"Role"
WHERE "role" = 'seller'::"Role";

-- Drop the column default so it doesn't block the type cast
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;

-- AlterEnum: remove seller value from Role enum
CREATE TYPE "Role_new" AS ENUM ('user', 'admin', 'super_admin');
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";

-- Restore the column default using the new enum type
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user'::"Role";
