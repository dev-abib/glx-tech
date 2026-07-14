-- AlterTable
ALTER TABLE "about_us" ADD COLUMN "highlight_text" TEXT,
ADD COLUMN "services" JSONB NOT NULL DEFAULT '[]';
