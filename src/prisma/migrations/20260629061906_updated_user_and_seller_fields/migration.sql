/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `SellerInfo` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updated_at` to the `SellerInfo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `SellerInfo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SellerInfo" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SellerInfo_userId_key" ON "SellerInfo"("userId");

-- AddForeignKey
ALTER TABLE "SellerInfo" ADD CONSTRAINT "SellerInfo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
