-- CreateTable
CREATE TABLE "EmailSubscribe" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subscribed" BOOLEAN NOT NULL DEFAULT true,
    "unsubscribeToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailSubscribe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailSubscribe_email_key" ON "EmailSubscribe"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSubscribe_unsubscribeToken_key" ON "EmailSubscribe"("unsubscribeToken");
