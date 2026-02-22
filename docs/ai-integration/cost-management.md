# Cost Management Specification: MedRecord AI

This document specifies cost estimation, tracking, and control strategies for the AI integration layer, including OpenAI API usage monitoring and budget management.

---

## Overview

MedRecord AI uses two primary OpenAI APIs that incur usage-based costs. This specification ensures cost visibility, predictability, and control.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Cost Management Overview                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      API Usage                                        │  │
│  │  ┌─────────────────────┐    ┌─────────────────────────┐              │  │
│  │  │  Whisper API        │    │  GPT-4 API              │              │  │
│  │  │  $0.006/minute      │    │  $0.03/1K input tokens  │              │  │
│  │  │  Audio transcription│    │  $0.06/1K output tokens │              │  │
│  │  └─────────────────────┘    └─────────────────────────┘              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                   │                                         │
│                                   ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      Cost Tracking                                    │  │
│  │  • Per-request logging  • Daily aggregation  • Monthly budgets       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                   │                                         │
│                                   ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      Cost Controls                                    │  │
│  │  • Budget alerts  • Rate limiting  • Model optimization              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Cost Structure

### OpenAI API Pricing (as of 2024)

| API | Model | Pricing | Unit |
|-----|-------|---------|------|
| **Whisper** | whisper-1 | $0.006 | per minute of audio |
| **GPT-4** | gpt-4 | $0.03 / $0.06 | per 1K input/output tokens |
| **GPT-4 Turbo** | gpt-4-turbo | $0.01 / $0.03 | per 1K input/output tokens |
| **GPT-3.5 Turbo** | gpt-3.5-turbo | $0.0005 / $0.0015 | per 1K input/output tokens |

### Cost per Operation

| Operation | Typical Input | Estimated Cost |
|-----------|--------------|----------------|
| **Transcribe 5 min** | 5 min audio | $0.03 |
| **Transcribe 15 min** | 15 min audio | $0.09 |
| **Transcribe 30 min** | 30 min audio | $0.18 |
| **Transcribe 60 min** | 60 min audio | $0.36 |
| **Extract fields** | ~1,500 tokens in, ~500 out | $0.075 |
| **Generate summary** | ~800 tokens in, ~200 out | $0.036 |

### Cost per Appointment (Average)

| Appointment Type | Audio Duration | Total Cost |
|-----------------|----------------|------------|
| **Quick visit** | 5 minutes | ~$0.11 |
| **Standard** | 15 minutes | ~$0.17 |
| **Extended** | 30 minutes | ~$0.26 |
| **Long consultation** | 60 minutes | ~$0.44 |

---

## Cost Tracking

### Usage Record Interface

```typescript
interface APIUsageRecord {
  id: string;
  timestamp: Date;
  appointmentId: string;
  userId: string;
  operation: 'transcription' | 'extraction' | 'summary';

  // Whisper-specific
  audioDuration?: number;          // seconds
  audioSize?: number;              // bytes

  // GPT-specific
  inputTokens?: number;
  outputTokens?: number;
  model?: string;

  // Cost calculation
  estimatedCost: number;           // USD

  // Performance
  processingTime: number;          // milliseconds
  success: boolean;
  errorCode?: string;
}

interface DailyUsageSummary {
  date: string;                    // YYYY-MM-DD
  userId: string;
  operations: {
    transcriptions: number;
    extractions: number;
    summaries: number;
  };
  metrics: {
    totalAudioMinutes: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
  };
  appointments: number;
}

interface MonthlyUsageSummary {
  month: string;                   // YYYY-MM
  userId: string;
  totals: {
    transcriptions: number;
    extractions: number;
    summaries: number;
    audioMinutes: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
  dailyBreakdown: DailyUsageSummary[];
  appointments: number;
}
```

### Cost Calculation Functions

```typescript
const PRICING = {
  whisper: {
    costPerMinute: 0.006,
  },
  gpt4: {
    inputCostPer1K: 0.03,
    outputCostPer1K: 0.06,
  },
  gpt4Turbo: {
    inputCostPer1K: 0.01,
    outputCostPer1K: 0.03,
  },
  gpt35Turbo: {
    inputCostPer1K: 0.0005,
    outputCostPer1K: 0.0015,
  },
};

function calculateTranscriptionCost(audioDurationSeconds: number): number {
  const minutes = audioDurationSeconds / 60;
  return Number((minutes * PRICING.whisper.costPerMinute).toFixed(6));
}

function calculateGPTCost(
  inputTokens: number,
  outputTokens: number,
  model: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo' = 'gpt-4'
): number {
  const pricing = {
    'gpt-4': PRICING.gpt4,
    'gpt-4-turbo': PRICING.gpt4Turbo,
    'gpt-3.5-turbo': PRICING.gpt35Turbo,
  }[model];

  const inputCost = (inputTokens / 1000) * pricing.inputCostPer1K;
  const outputCost = (outputTokens / 1000) * pricing.outputCostPer1K;

  return Number((inputCost + outputCost).toFixed(6));
}

function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

function calculateAppointmentCost(
  audioDurationSeconds: number,
  extractionInputTokens: number,
  extractionOutputTokens: number,
  summaryInputTokens: number = 0,
  summaryOutputTokens: number = 0,
  model: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo' = 'gpt-4'
): {
  transcription: number;
  extraction: number;
  summary: number;
  total: number;
} {
  const transcription = calculateTranscriptionCost(audioDurationSeconds);
  const extraction = calculateGPTCost(extractionInputTokens, extractionOutputTokens, model);
  const summary = calculateGPTCost(summaryInputTokens, summaryOutputTokens, model);

  return {
    transcription,
    extraction,
    summary,
    total: Number((transcription + extraction + summary).toFixed(4)),
  };
}
```

### Usage Logging Service

```typescript
import { logger } from '../lib/logger';

class UsageTrackingService {
  async logUsage(record: Omit<APIUsageRecord, 'id' | 'timestamp'>): Promise<void> {
    const fullRecord: APIUsageRecord = {
      id: generateId(),
      timestamp: new Date(),
      ...record,
    };

    // Log for debugging
    logger.info('API usage recorded', {
      operation: record.operation,
      cost: record.estimatedCost,
      appointmentId: record.appointmentId,
    });

    // Persist to database
    await db.apiUsage.create({ data: fullRecord });

    // Update daily aggregates
    await this.updateDailyAggregate(fullRecord);

    // Check budget alerts
    await this.checkBudgetAlerts(fullRecord.userId);
  }

  async getDailyUsage(userId: string, date: Date): Promise<DailyUsageSummary> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const records = await db.apiUsage.findMany({
      where: {
        userId,
        timestamp: { gte: startOfDay, lte: endOfDay },
      },
    });

    return this.aggregateRecords(records, date.toISOString().split('T')[0], userId);
  }

  async getMonthlyUsage(userId: string, year: number, month: number): Promise<MonthlyUsageSummary> {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const records = await db.apiUsage.findMany({
      where: {
        userId,
        timestamp: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    // Group by day
    const dailyMap = new Map<string, APIUsageRecord[]>();
    for (const record of records) {
      const dateKey = record.timestamp.toISOString().split('T')[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, []);
      }
      dailyMap.get(dateKey)!.push(record);
    }

    const dailyBreakdown: DailyUsageSummary[] = [];
    for (const [date, dayRecords] of dailyMap) {
      dailyBreakdown.push(this.aggregateRecords(dayRecords, date, userId));
    }

    // Calculate totals
    const totals = dailyBreakdown.reduce(
      (acc, day) => ({
        transcriptions: acc.transcriptions + day.operations.transcriptions,
        extractions: acc.extractions + day.operations.extractions,
        summaries: acc.summaries + day.operations.summaries,
        audioMinutes: acc.audioMinutes + day.metrics.totalAudioMinutes,
        inputTokens: acc.inputTokens + day.metrics.totalInputTokens,
        outputTokens: acc.outputTokens + day.metrics.totalOutputTokens,
        cost: acc.cost + day.metrics.totalCost,
      }),
      {
        transcriptions: 0,
        extractions: 0,
        summaries: 0,
        audioMinutes: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
      }
    );

    const uniqueAppointments = new Set(records.map(r => r.appointmentId)).size;

    return {
      month: `${year}-${String(month).padStart(2, '0')}`,
      userId,
      totals,
      dailyBreakdown,
      appointments: uniqueAppointments,
    };
  }

  private aggregateRecords(
    records: APIUsageRecord[],
    date: string,
    userId: string
  ): DailyUsageSummary {
    const operations = { transcriptions: 0, extractions: 0, summaries: 0 };
    const metrics = {
      totalAudioMinutes: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
    };

    for (const record of records) {
      switch (record.operation) {
        case 'transcription':
          operations.transcriptions++;
          metrics.totalAudioMinutes += (record.audioDuration || 0) / 60;
          break;
        case 'extraction':
          operations.extractions++;
          metrics.totalInputTokens += record.inputTokens || 0;
          metrics.totalOutputTokens += record.outputTokens || 0;
          break;
        case 'summary':
          operations.summaries++;
          metrics.totalInputTokens += record.inputTokens || 0;
          metrics.totalOutputTokens += record.outputTokens || 0;
          break;
      }
      metrics.totalCost += record.estimatedCost;
    }

    const uniqueAppointments = new Set(records.map(r => r.appointmentId)).size;

    return {
      date,
      userId,
      operations,
      metrics: {
        ...metrics,
        totalAudioMinutes: Number(metrics.totalAudioMinutes.toFixed(2)),
        totalCost: Number(metrics.totalCost.toFixed(4)),
      },
      appointments: uniqueAppointments,
    };
  }

  private async updateDailyAggregate(record: APIUsageRecord): Promise<void> {
    // Update or create daily aggregate in database
    const date = record.timestamp.toISOString().split('T')[0];

    await db.dailyUsage.upsert({
      where: { userId_date: { userId: record.userId, date } },
      update: {
        totalCost: { increment: record.estimatedCost },
        operationCount: { increment: 1 },
      },
      create: {
        userId: record.userId,
        date,
        totalCost: record.estimatedCost,
        operationCount: 1,
      },
    });
  }

  private async checkBudgetAlerts(userId: string): Promise<void> {
    const monthlyUsage = await this.getMonthlyUsage(
      userId,
      new Date().getFullYear(),
      new Date().getMonth() + 1
    );

    const budget = await this.getUserBudget(userId);

    if (monthlyUsage.totals.cost >= budget.monthlyLimit * 0.8) {
      await this.sendBudgetAlert(userId, monthlyUsage.totals.cost, budget.monthlyLimit);
    }

    if (monthlyUsage.totals.cost >= budget.monthlyLimit) {
      await this.handleBudgetExceeded(userId);
    }
  }

  private async getUserBudget(userId: string): Promise<{ monthlyLimit: number }> {
    const settings = await db.userSettings.findUnique({ where: { userId } });
    return { monthlyLimit: settings?.monthlyBudget || 50 }; // Default $50/month
  }

  private async sendBudgetAlert(
    userId: string,
    currentCost: number,
    limit: number
  ): Promise<void> {
    // Send notification to user
    logger.warn('Budget alert', { userId, currentCost, limit });
    // await notificationService.send(userId, { type: 'BUDGET_WARNING', ... });
  }

  private async handleBudgetExceeded(userId: string): Promise<void> {
    // Could disable AI features or notify admin
    logger.warn('Budget exceeded', { userId });
  }
}

export const usageTrackingService = new UsageTrackingService();
```

---

## Cost Control Measures

### Budget Configuration

```typescript
interface BudgetConfig {
  enabled: boolean;
  monthlyLimit: number;          // USD
  dailyLimit?: number;           // USD
  warningThreshold: number;      // Percentage (0-1)
  hardLimitEnabled: boolean;     // Disable AI at limit
  alertRecipients: string[];     // Email addresses
}

const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
  enabled: true,
  monthlyLimit: 50,
  dailyLimit: 5,
  warningThreshold: 0.8,         // Warn at 80%
  hardLimitEnabled: false,
  alertRecipients: [],
};
```

### Budget Enforcement

```typescript
class BudgetEnforcementService {
  async checkBudget(userId: string): Promise<{
    allowed: boolean;
    remaining: number;
    percentUsed: number;
    message?: string;
  }> {
    const budget = await this.getBudgetConfig(userId);
    const usage = await usageTrackingService.getMonthlyUsage(
      userId,
      new Date().getFullYear(),
      new Date().getMonth() + 1
    );

    const remaining = budget.monthlyLimit - usage.totals.cost;
    const percentUsed = usage.totals.cost / budget.monthlyLimit;

    // Check if hard limit enabled and exceeded
    if (budget.hardLimitEnabled && remaining <= 0) {
      return {
        allowed: false,
        remaining: 0,
        percentUsed: 1,
        message: 'Monthly AI budget exceeded. AI features are temporarily disabled.',
      };
    }

    // Check warning threshold
    if (percentUsed >= budget.warningThreshold) {
      return {
        allowed: true,
        remaining: Math.max(0, remaining),
        percentUsed,
        message: `Warning: ${Math.round(percentUsed * 100)}% of monthly AI budget used.`,
      };
    }

    return {
      allowed: true,
      remaining,
      percentUsed,
    };
  }

  async canPerformOperation(
    userId: string,
    estimatedCost: number
  ): Promise<boolean> {
    const budgetCheck = await this.checkBudget(userId);

    if (!budgetCheck.allowed) {
      return false;
    }

    if (budgetCheck.remaining < estimatedCost) {
      const budget = await this.getBudgetConfig(userId);
      if (budget.hardLimitEnabled) {
        return false;
      }
    }

    return true;
  }

  private async getBudgetConfig(userId: string): Promise<BudgetConfig> {
    const settings = await db.userSettings.findUnique({ where: { userId } });

    if (!settings?.budgetConfig) {
      return DEFAULT_BUDGET_CONFIG;
    }

    return {
      ...DEFAULT_BUDGET_CONFIG,
      ...settings.budgetConfig,
    };
  }
}

export const budgetEnforcementService = new BudgetEnforcementService();
```

### Pre-operation Cost Check Middleware

```typescript
async function costCheckMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.user.id;
  const operation = req.path.includes('transcribe')
    ? 'transcription'
    : req.path.includes('extract')
    ? 'extraction'
    : 'summary';

  // Estimate cost based on request
  let estimatedCost = 0;

  if (operation === 'transcription' && req.file) {
    // Estimate audio duration from file size (rough)
    const estimatedMinutes = req.file.size / (32000 / 8 * 60); // 32kbps
    estimatedCost = calculateTranscriptionCost(estimatedMinutes * 60);
  } else if (operation === 'extraction') {
    // Estimate based on transcript length
    const transcriptLength = req.body.transcript?.length || 0;
    const estimatedTokens = estimateTokens(req.body.transcript || '');
    estimatedCost = calculateGPTCost(estimatedTokens, 500);
  }

  const canProceed = await budgetEnforcementService.canPerformOperation(
    userId,
    estimatedCost
  );

  if (!canProceed) {
    res.status(402).json({
      success: false,
      error: {
        code: 'BUDGET_EXCEEDED',
        message: 'Monthly AI budget exceeded. Please try again next month or upgrade your plan.',
        budgetInfo: await budgetEnforcementService.checkBudget(userId),
      },
    });
    return;
  }

  next();
}
```

---

## Cost Optimization Strategies

### Model Selection

| Use Case | Recommended Model | Rationale |
|----------|-------------------|-----------|
| **Field Extraction** | GPT-4 | Best accuracy for medical data |
| **Summary Generation** | GPT-4-Turbo | Good accuracy, lower cost |
| **Simple Tasks** | GPT-3.5-Turbo | Cost-effective for basic tasks |

### Optimization Techniques

```typescript
interface OptimizationConfig {
  // Transcription optimizations
  minAudioDuration: number;       // Skip very short recordings
  maxAudioDuration: number;       // Split long recordings

  // Token optimizations
  maxTranscriptLength: number;    // Truncate long transcripts
  useCompression: boolean;        // Compress prompts

  // Model selection
  preferredExtractionModel: string;
  preferredSummaryModel: string;

  // Caching
  enableResponseCaching: boolean;
  cacheTTL: number;               // seconds
}

const DEFAULT_OPTIMIZATION: OptimizationConfig = {
  minAudioDuration: 30,           // 30 seconds minimum
  maxAudioDuration: 3600,         // 60 minutes maximum
  maxTranscriptLength: 20000,     // ~5000 tokens
  useCompression: true,
  preferredExtractionModel: 'gpt-4',
  preferredSummaryModel: 'gpt-4-turbo',
  enableResponseCaching: false,   // Disabled for medical data
  cacheTTL: 0,
};

function selectOptimalModel(
  operation: 'extraction' | 'summary',
  inputLength: number,
  config: OptimizationConfig
): string {
  // Use configured model
  if (operation === 'extraction') {
    return config.preferredExtractionModel;
  }

  if (operation === 'summary') {
    return config.preferredSummaryModel;
  }

  // Default to GPT-4 for accuracy
  return 'gpt-4';
}

function optimizeTranscript(
  transcript: string,
  config: OptimizationConfig
): string {
  if (transcript.length <= config.maxTranscriptLength) {
    return transcript;
  }

  // Keep beginning and end (most important parts)
  const halfLength = Math.floor(config.maxTranscriptLength / 2);
  return (
    transcript.slice(0, halfLength) +
    '\n\n[... middle portion omitted for processing ...]\n\n' +
    transcript.slice(-halfLength)
  );
}
```

### Batch Processing

```typescript
interface BatchJob {
  id: string;
  appointmentIds: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  results: Record<string, { success: boolean; cost: number }>;
  totalCost: number;
}

async function processBatch(
  appointmentIds: string[],
  userId: string
): Promise<BatchJob> {
  const job: BatchJob = {
    id: generateId(),
    appointmentIds,
    status: 'pending',
    createdAt: new Date(),
    results: {},
    totalCost: 0,
  };

  // Estimate total cost
  const estimatedTotalCost = appointmentIds.length * 0.20; // ~$0.20 per appointment

  // Check budget
  const canProceed = await budgetEnforcementService.canPerformOperation(
    userId,
    estimatedTotalCost
  );

  if (!canProceed) {
    throw new Error('Insufficient budget for batch processing');
  }

  // Process sequentially to manage rate limits
  job.status = 'processing';

  for (const appointmentId of appointmentIds) {
    try {
      const result = await processAppointment(appointmentId);
      job.results[appointmentId] = { success: true, cost: result.cost };
      job.totalCost += result.cost;
    } catch (error) {
      job.results[appointmentId] = { success: false, cost: 0 };
    }
  }

  job.status = 'completed';
  job.completedAt = new Date();

  return job;
}
```

---

## Cost Reporting

### Dashboard Data

```typescript
interface CostDashboardData {
  currentMonth: {
    totalCost: number;
    budgetLimit: number;
    percentUsed: number;
    daysRemaining: number;
    projectedMonthEnd: number;
  };
  breakdown: {
    transcription: number;
    extraction: number;
    summary: number;
  };
  trends: {
    dailyAverage: number;
    weekOverWeek: number;        // Percentage change
    monthOverMonth: number;
  };
  topUsage: {
    date: string;
    cost: number;
    appointments: number;
  }[];
}

async function getCostDashboardData(userId: string): Promise<CostDashboardData> {
  const now = new Date();
  const monthlyUsage = await usageTrackingService.getMonthlyUsage(
    userId,
    now.getFullYear(),
    now.getMonth() + 1
  );

  const budget = await budgetEnforcementService.checkBudget(userId);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysRemaining = daysInMonth - dayOfMonth;

  // Calculate breakdown
  const transcriptionCost = monthlyUsage.dailyBreakdown.reduce((sum, day) => {
    const transcriptions = day.operations.transcriptions;
    const avgCostPerTranscription = 0.10; // Estimate
    return sum + transcriptions * avgCostPerTranscription;
  }, 0);

  const dailyAverage = monthlyUsage.totals.cost / dayOfMonth;
  const projectedMonthEnd = monthlyUsage.totals.cost + (dailyAverage * daysRemaining);

  // Get previous month for comparison
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const prevMonthUsage = await usageTrackingService.getMonthlyUsage(userId, prevYear, prevMonth);

  const monthOverMonth = prevMonthUsage.totals.cost > 0
    ? ((monthlyUsage.totals.cost - prevMonthUsage.totals.cost) / prevMonthUsage.totals.cost) * 100
    : 0;

  // Top usage days
  const topUsage = monthlyUsage.dailyBreakdown
    .sort((a, b) => b.metrics.totalCost - a.metrics.totalCost)
    .slice(0, 5)
    .map(day => ({
      date: day.date,
      cost: day.metrics.totalCost,
      appointments: day.appointments,
    }));

  return {
    currentMonth: {
      totalCost: monthlyUsage.totals.cost,
      budgetLimit: budget.remaining + monthlyUsage.totals.cost,
      percentUsed: budget.percentUsed * 100,
      daysRemaining,
      projectedMonthEnd,
    },
    breakdown: {
      transcription: transcriptionCost,
      extraction: monthlyUsage.totals.cost - transcriptionCost,
      summary: 0, // Would need more detailed tracking
    },
    trends: {
      dailyAverage,
      weekOverWeek: 0, // Would need weekly tracking
      monthOverMonth,
    },
    topUsage,
  };
}
```

### API Routes for Cost Data

```typescript
import { Router } from 'express';

const router = Router();

// GET /api/usage/current-month
router.get('/usage/current-month', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const now = new Date();

  const usage = await usageTrackingService.getMonthlyUsage(
    userId,
    now.getFullYear(),
    now.getMonth() + 1
  );

  res.json({ success: true, data: usage });
});

// GET /api/usage/dashboard
router.get('/usage/dashboard', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const dashboard = await getCostDashboardData(userId);
  res.json({ success: true, data: dashboard });
});

// GET /api/usage/budget
router.get('/usage/budget', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const budgetStatus = await budgetEnforcementService.checkBudget(userId);
  res.json({ success: true, data: budgetStatus });
});

// PUT /api/usage/budget
router.put('/usage/budget', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { monthlyLimit, dailyLimit, warningThreshold, hardLimitEnabled } = req.body;

  await db.userSettings.upsert({
    where: { userId },
    update: {
      budgetConfig: { monthlyLimit, dailyLimit, warningThreshold, hardLimitEnabled },
    },
    create: {
      userId,
      budgetConfig: { monthlyLimit, dailyLimit, warningThreshold, hardLimitEnabled },
    },
  });

  res.json({ success: true });
});

export default router;
```

---

## Monthly Cost Projections

### Usage Scenarios

| Scenario | Appointments/Month | Avg Duration | Monthly Cost |
|----------|-------------------|--------------|--------------|
| **Solo Practice (Low)** | 50 | 15 min | ~$10 |
| **Solo Practice (Medium)** | 150 | 15 min | ~$30 |
| **Solo Practice (High)** | 300 | 15 min | ~$60 |
| **Small Clinic (3 doctors)** | 500 | 15 min | ~$100 |
| **Medium Clinic (10 doctors)** | 1500 | 15 min | ~$300 |

### Projection Formula

```typescript
function projectMonthlyCost(
  appointmentsPerMonth: number,
  avgDurationMinutes: number,
  options: {
    includeExtraction: boolean;
    includeSummary: boolean;
    model: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
  } = { includeExtraction: true, includeSummary: true, model: 'gpt-4' }
): {
  transcription: number;
  extraction: number;
  summary: number;
  total: number;
} {
  // Transcription cost
  const transcription = appointmentsPerMonth * avgDurationMinutes * PRICING.whisper.costPerMinute;

  // Extraction cost (if enabled)
  let extraction = 0;
  if (options.includeExtraction) {
    const avgInputTokens = 1500;
    const avgOutputTokens = 500;
    extraction = appointmentsPerMonth * calculateGPTCost(avgInputTokens, avgOutputTokens, options.model);
  }

  // Summary cost (if enabled)
  let summary = 0;
  if (options.includeSummary) {
    const avgInputTokens = 800;
    const avgOutputTokens = 200;
    summary = appointmentsPerMonth * calculateGPTCost(avgInputTokens, avgOutputTokens, options.model);
  }

  return {
    transcription: Number(transcription.toFixed(2)),
    extraction: Number(extraction.toFixed(2)),
    summary: Number(summary.toFixed(2)),
    total: Number((transcription + extraction + summary).toFixed(2)),
  };
}
```

---

## References

- [OpenAI Pricing](https://openai.com/pricing)
- [OpenAI Usage Dashboard](https://platform.openai.com/usage)
- [Transcription Pipeline](./transcription-pipeline.md)
- [Field Extraction](./field-extraction.md)
- [AI Services Tech Stack](../tech-stack/ai-services.md)
