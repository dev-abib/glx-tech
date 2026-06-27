-- CreateEnum
CREATE TYPE "Insurance" AS ENUM ('yes', 'no', 'not_applicable');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isSeller" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SellerInfo" (
    "id" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "servicesId" TEXT[],
    "insuranceStatus" "Insurance" NOT NULL,
    "socialLInk" TEXT NOT NULL,
    "businessNumber" TEXT NOT NULL,
    "businessEmail" TEXT NOT NULL,
    "streetAddress" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,

    CONSTRAINT "SellerInfo_pkey" PRIMARY KEY ("id")
);
