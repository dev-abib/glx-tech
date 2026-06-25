/*
  Warnings:

  - You are about to drop the `Media` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `media` to the `Listing` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Media" DROP CONSTRAINT "Media_listingId_fkey";

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "media" JSONB NOT NULL;

-- DropTable
DROP TABLE "Media";
