/*
  Warnings:

  - You are about to drop the column `pictureId` on the `Review` table. All the data in the column will be lost.
  - Added the required column `picturePublicId` to the `Review` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Review" DROP COLUMN "pictureId",
ADD COLUMN     "picturePublicId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Social" (
    "id" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "iconPublicId" TEXT NOT NULL,
    "socialLink" TEXT NOT NULL,

    CONSTRAINT "Social_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "subTitle" TEXT,
    "footerTxt" TEXT,
    "siteLink" TEXT,
    "location" TEXT,
    "phone" TEXT,
    "email" TEXT,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);
