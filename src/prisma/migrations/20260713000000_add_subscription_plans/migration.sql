-- CreateTable: subscription_plans
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price_monthly" INTEGER NOT NULL,
    "price_annual" INTEGER NOT NULL,
    "stripe_price_id_monthly" TEXT,
    "stripe_price_id_annual" TEXT,
    "max_active_listings" INTEGER NOT NULL DEFAULT 0,
    "platform_fee_percent" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_slug_key" ON "subscription_plans"("slug");

-- CreateTable: plan_features
CREATE TABLE "plan_features" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "plan_features_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_features_plan_id_key_key" ON "plan_features"("plan_id", "key");

-- AddForeignKey
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: feature_definitions
CREATE TABLE "feature_definitions" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feature_definitions_key_key" ON "feature_definitions"("key");

-- AlterTable: users - add new subscription fields
ALTER TABLE "users" ADD COLUMN "subscription_plan_id" TEXT;
ALTER TABLE "users" ADD COLUMN "subscription_status" TEXT;
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" TEXT;
ALTER TABLE "users" ADD COLUMN "stripe_subscription_id" TEXT;
ALTER TABLE "users" ADD COLUMN "current_period_end" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop old plan column and enum
ALTER TABLE "users" DROP COLUMN IF EXISTS "plan";
DROP TYPE IF EXISTS "Plan";
