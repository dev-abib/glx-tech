/*
  Warnings:

  - You are about to drop the column `address` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `timeSlot` on the `Listing` table. All the data in the column will be lost.
  - Added the required column `addressId` to the `Listing` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "address",
DROP COLUMN "timeSlot",
ADD COLUMN     "addressId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Selleraddress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
