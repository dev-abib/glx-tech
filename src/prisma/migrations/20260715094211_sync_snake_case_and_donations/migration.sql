/*
  Warnings:

  - You are about to drop the column `city` on the `SellerInfo` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `SellerInfo` table. All the data in the column will be lost.
  - You are about to drop the column `streetAddress` on the `SellerInfo` table. All the data in the column will be lost.
  - You are about to drop the column `zipCode` on the `SellerInfo` table. All the data in the column will be lost.
  - You are about to drop the column `bodyHtml` on the `campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `ctaLink` on the `campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `ctaText` on the `campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `sentAt` on the `campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `accessToken` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `avatarPublicId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `blockedUntil` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `isPaid` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `isResetRequest` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `isSeller` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `otpAttempts` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `otpExpiresAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `resetToken` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[listingId,bookingDate,bookingTime,status]` on the table `Appointment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `bookingDate` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bookingTime` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `details` to the `Service` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Service` table without a default value. This is not possible if the table is not empty.
  - Added the required column `body_html` to the `campaigns` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "bookingDate" TEXT NOT NULL,
ADD COLUMN     "bookingTime" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'pending';

-- AlterTable
ALTER TABLE "SellerInfo" DROP COLUMN "city",
DROP COLUMN "state",
DROP COLUMN "streetAddress",
DROP COLUMN "zipCode";

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "details" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "campaigns" DROP COLUMN "bodyHtml",
DROP COLUMN "createdAt",
DROP COLUMN "ctaLink",
DROP COLUMN "ctaText",
DROP COLUMN "sentAt",
ADD COLUMN     "body_html" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "cta_link" TEXT,
ADD COLUMN     "cta_text" TEXT,
ADD COLUMN     "sent_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "subscription_plans" ALTER COLUMN "platform_fee_percent" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "users" DROP COLUMN "accessToken",
DROP COLUMN "avatarPublicId",
DROP COLUMN "blockedUntil",
DROP COLUMN "isPaid",
DROP COLUMN "isResetRequest",
DROP COLUMN "isSeller",
DROP COLUMN "otpAttempts",
DROP COLUMN "otpExpiresAt",
DROP COLUMN "resetToken",
ADD COLUMN     "access_token" TEXT,
ADD COLUMN     "avatar_public_id" TEXT,
ADD COLUMN     "blocked_until" TIMESTAMP(3),
ADD COLUMN     "is_paid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_reset_request" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_seller" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "otp_attempts" INTEGER DEFAULT 0,
ADD COLUMN     "otp_expires_at" TIMESTAMP(3),
ADD COLUMN     "reset_token" TEXT;

-- CreateTable
CREATE TABLE "Selleraddress" (
    "id" TEXT NOT NULL,
    "streetAddress" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,

    CONSTRAINT "Selleraddress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_listingId_bookingDate_bookingTime_status_key" ON "Appointment"("listingId", "bookingDate", "bookingTime", "status");

-- AddForeignKey
ALTER TABLE "Selleraddress" ADD CONSTRAINT "Selleraddress_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerInfo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
