-- CreateTable
CREATE TABLE "transcriptions" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "fullText" TEXT,
    "language" TEXT DEFAULT 'es',
    "durationSeconds" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transcriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transcriptions_appointmentId_key" ON "transcriptions"("appointmentId");

-- AddForeignKey
ALTER TABLE "transcriptions" ADD CONSTRAINT "transcriptions_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
