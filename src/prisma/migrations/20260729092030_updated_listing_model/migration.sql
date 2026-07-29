/*
  Warnings:

  - You are about to drop the column `latitude` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `Listing` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "latitude",
DROP COLUMN "longitude";
