/*
  Warnings:

  - You are about to drop the column `days` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `weekend` on the `Listing` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "days",
DROP COLUMN "weekend";
