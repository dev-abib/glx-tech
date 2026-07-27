/*
  Warnings:

  - The `bookingTime` column is now optional (nullable) to support rent-type appointments.
  - A new `APPOINTMENT_TYPE` enum has been added.
  - New columns added for type-specific data: `price` (service), `hourlyPrice`/`dailyPrice`/`duration`/`durationUnit` (rent).

*/

-- CreateEnum
CREATE TYPE "APPOINTMENT_TYPE" AS ENUM ('SERVICE', 'RENT');

-- AlterTable
ALTER TABLE "Appointment"
  ADD COLUMN "appointmentType" "APPOINTMENT_TYPE" NOT NULL DEFAULT 'SERVICE',
  ADD COLUMN "price" DOUBLE PRECISION,
  ADD COLUMN "hourlyPrice" DOUBLE PRECISION,
  ADD COLUMN "dailyPrice" DOUBLE PRECISION,
  ADD COLUMN "duration" DOUBLE PRECISION,
  ADD COLUMN "durationUnit" TEXT,
  ALTER COLUMN "bookingTime" DROP NOT NULL;
