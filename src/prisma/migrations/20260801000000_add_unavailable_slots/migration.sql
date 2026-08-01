-- CreateTable
CREATE TABLE "UnavailableSlot" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnavailableSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UnavailableSlot_sellerId_date_idx" ON "UnavailableSlot"("sellerId", "date");

-- AddForeignKey
ALTER TABLE "UnavailableSlot" ADD CONSTRAINT "UnavailableSlot_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
