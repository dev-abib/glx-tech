-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('pending', 'completed', 'failed');

-- CreateTable
CREATE TABLE "donations" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "stripe_session_id" TEXT,
    "stripe_payment_id" TEXT,
    "stripe_payment_link_id" TEXT,
    "customer_email" TEXT,
    "customer_name" TEXT,
    "message" TEXT,
    "status" "DonationStatus" NOT NULL DEFAULT 'pending',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "donations_stripe_session_id_key" ON "donations"("stripe_session_id");
