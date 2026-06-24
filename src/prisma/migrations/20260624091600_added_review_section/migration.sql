/*
  Warnings:

  - You are about to drop the `site_settings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "site_settings";

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "reviewDate" TEXT NOT NULL,
    "picture" TEXT NOT NULL,
    "pictureId" TEXT NOT NULL,
    "review" TEXT NOT NULL,
    "ratingCount" TEXT NOT NULL,
    "sectionId" TEXT,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewSection" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subTitle" TEXT NOT NULL,

    CONSTRAINT "ReviewSection_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ReviewSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
