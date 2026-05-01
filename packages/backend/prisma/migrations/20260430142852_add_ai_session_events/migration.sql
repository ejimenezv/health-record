-- CreateTable
CREATE TABLE "ai_sessions" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT,
    "sessionId" TEXT NOT NULL,
    "patientId" TEXT,
    "providerId" TEXT,
    "appointmentType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "websocketUrl" TEXT,
    "finalTranscript" TEXT,
    "totalCostUsd" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "audioDurationSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ai_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcription_events" (
    "id" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "chunkIndex" INTEGER,
    "text" TEXT,
    "speakerId" TEXT,
    "speakerRole" TEXT,
    "confidence" DECIMAL(5,4),
    "startTime" DECIMAL(10,3),
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventData" JSONB NOT NULL,

    CONSTRAINT "transcription_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extraction_events" (
    "id" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityType" TEXT,
    "content" TEXT,
    "confidence" DECIMAL(5,4),
    "validationStatus" TEXT,
    "chunkIndex" INTEGER,
    "speaker" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventData" JSONB NOT NULL,

    CONSTRAINT "extraction_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_alerts" (
    "id" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "relatedEntities" JSONB NOT NULL,
    "recommendedAction" TEXT,
    "requiresImmediateAttention" BOOLEAN NOT NULL DEFAULT false,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventData" JSONB NOT NULL,

    CONSTRAINT "validation_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_events" (
    "id" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "transcriptionCostUsd" DECIMAL(10,6),
    "extractionCostUsd" DECIMAL(10,6),
    "totalCostUsd" DECIMAL(10,6),
    "chunksProcessed" INTEGER,
    "cacheHitRate" DECIMAL(5,4),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventData" JSONB NOT NULL,

    CONSTRAINT "cost_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_sessions_sessionId_key" ON "ai_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "ai_sessions_sessionId_idx" ON "ai_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "ai_sessions_appointmentId_idx" ON "ai_sessions"("appointmentId");

-- CreateIndex
CREATE INDEX "ai_sessions_status_idx" ON "ai_sessions"("status");

-- CreateIndex
CREATE INDEX "transcription_events_sessionId_timestamp_idx" ON "transcription_events"("sessionId", "timestamp");

-- CreateIndex
CREATE INDEX "transcription_events_sessionId_chunkIndex_idx" ON "transcription_events"("sessionId", "chunkIndex");

-- CreateIndex
CREATE INDEX "extraction_events_sessionId_entityType_idx" ON "extraction_events"("sessionId", "entityType");

-- CreateIndex
CREATE INDEX "extraction_events_entityId_idx" ON "extraction_events"("entityId");

-- CreateIndex
CREATE INDEX "extraction_events_sessionId_timestamp_idx" ON "extraction_events"("sessionId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "validation_alerts_alertId_key" ON "validation_alerts"("alertId");

-- CreateIndex
CREATE INDEX "validation_alerts_sessionId_severity_idx" ON "validation_alerts"("sessionId", "severity");

-- CreateIndex
CREATE INDEX "validation_alerts_alertId_idx" ON "validation_alerts"("alertId");

-- CreateIndex
CREATE INDEX "cost_events_sessionId_timestamp_idx" ON "cost_events"("sessionId", "timestamp");

-- AddForeignKey
ALTER TABLE "transcription_events" ADD CONSTRAINT "transcription_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ai_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extraction_events" ADD CONSTRAINT "extraction_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ai_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_alerts" ADD CONSTRAINT "validation_alerts_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ai_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_events" ADD CONSTRAINT "cost_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ai_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
