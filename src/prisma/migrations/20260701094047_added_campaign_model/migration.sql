-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'sending', 'sent');

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "ctaText" TEXT,
    "ctaLink" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);
