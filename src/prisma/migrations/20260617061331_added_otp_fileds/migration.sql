-- AlterTable
ALTER TABLE "users" ADD COLUMN     "otp" TEXT,
ADD COLUMN     "otpAttempts" INTEGER DEFAULT 0,
ADD COLUMN     "otpExpiresAt" TIMESTAMP(3);
