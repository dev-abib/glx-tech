-- CreateTable
CREATE TABLE "about_us" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image1" TEXT,
    "image1_public_id" TEXT,
    "image2" TEXT,
    "image2_public_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "about_us_pkey" PRIMARY KEY ("id")
);
