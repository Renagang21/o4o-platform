import cron, { type ScheduledTask } from 'node-cron';
import { OperationsService } from '../services/OperationsService.js';

/**
 * Commission Batch Job
 *
 * Automatically confirms pending commissions after hold period expires.
 *
 * Schedule: Daily at 02:00 (server time)
 * Hold Period: 7 days (configurable)
 *
 * Process:
 * 1. Find all commissions with status=PENDING and holdUntil < now()
 * 2. Confirm each commission
 * 3. Create audit log with action='auto_confirmed'
 * 4. Emit 'commission.auto_confirmed' event for webhook notification
 * 5. Log summary statistics
 *
 * @job Phase 2.2 - Stage 4
 */

let isRunning = false;
let lastRunTime: Date | null = null;
let lastRunStats: {
  total: number;
  confirmed: number;
  failed: number;
  duration: number;
} | null = null;

/**
 * Execute batch confirmation job
 */
async function executeCommissionBatchJob(): Promise<void> {
  if (isRunning) {
    console.log('[Commission Batch] ⚠️  Job already running, skipping this execution');
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  console.log('[Commission Batch] 🚀 Starting batch confirmation job...');
  console.log(`[Commission Batch] Time: ${new Date().toISOString()}`);

  try {
    const operationsService = new OperationsService();

    // Get event emitter for webhook notifications
    const eventEmitter = operationsService.getEventEmitter();

    // Execute batch confirmation
    const results = await operationsService.batchConfirmCommissions();

    const duration = Date.now() - startTime;

    // Update last run stats
    lastRunTime = new Date();
    lastRunStats = {
      total: results.total,
      confirmed: results.confirmed,
      failed: results.failed,
      duration
    };

    // Webhook events are automatically emitted by OperationsService.batchConfirmCommissions()
    if (results.confirmed > 0) {
      console.log(`[Commission Batch] ✅ ${results.confirmed} commission.auto_confirmed events emitted`);
    }

    // Log summary
    console.log('[Commission Batch] ✅ Job completed successfully');
    console.log(`[Commission Batch] Total commissions processed: ${results.total}`);
    console.log(`[Commission Batch] Confirmed: ${results.confirmed}`);
    console.log(`[Commission Batch] Failed: ${results.failed}`);
    console.log(`[Commission Batch] Duration: ${duration}ms`);

    // Log errors if any
    if (results.errors.length > 0) {
      console.error(`[Commission Batch] ❌ ${results.errors.length} errors occurred:`);
      results.errors.forEach(err => {
        console.error(`  - Commission ${err.commissionId}: ${err.error}`);
      });
    }

    // Success rate
    if (results.total > 0) {
      const successRate = (results.confirmed / results.total) * 100;
      console.log(`[Commission Batch] Success rate: ${successRate.toFixed(2)}%`);
    }

  } catch (error) {
    console.error('[Commission Batch] ❌ Job failed with error:', error);

    // Update stats with failure
    lastRunTime = new Date();
    lastRunStats = {
      total: 0,
      confirmed: 0,
      failed: 1,
      duration: Date.now() - startTime
    };
  } finally {
    isRunning = false;
  }
}

/**
 * Initialize commission batch job with cron schedule
 *
 * Default: Every day at 02:00
 * Override with COMMISSION_BATCH_SCHEDULE env var (cron format)
 *
 * @param schedule - Cron schedule (optional, default: '0 2 * * *')
 * @returns Cron task
 */
export function initializeCommissionBatchJob(schedule: string = '0 2 * * *'): ScheduledTask {
  // Allow override from environment
  const cronSchedule = process.env.COMMISSION_BATCH_SCHEDULE || schedule;

  console.log('[Commission Batch] Initializing batch job...');
  console.log(`[Commission Batch] Schedule: ${cronSchedule} (${getCronDescription(cronSchedule)})`);

  // Validate cron schedule
  if (!cron.validate(cronSchedule)) {
    throw new Error(`Invalid cron schedule: ${cronSchedule}`);
  }

  // Create scheduled task
  const task = cron.schedule(
    cronSchedule,
    async () => {
      await executeCommissionBatchJob();
    },
    {
      timezone: process.env.TZ || 'Asia/Seoul' // Default to KST
    }
  );

  console.log('[Commission Batch] ✅ Batch job initialized successfully');
  console.log(`[Commission Batch] Timezone: ${process.env.TZ || 'Asia/Seoul'}`);
  console.log(`[Commission Batch] Next run: ${getNextRunTime(cronSchedule)}`);

  return task;
}

/**
 * Get human-readable description of cron schedule
 */
function getCronDescription(schedule: string): string {
  const scheduleMap: Record<string, string> = {
    '0 2 * * *': 'Daily at 02:00',
    '0 */6 * * *': 'Every 6 hours',
    '0 0 * * *': 'Daily at midnight',
    '*/30 * * * *': 'Every 30 minutes',
    '0 0 * * 0': 'Weekly on Sunday at midnight'
  };

  return scheduleMap[schedule] || schedule;
}

/**
 * Get next scheduled run time
 */
function getNextRunTime(schedule: string): string {
  try {
    // Note: node-cron doesn't provide next execution time in API
    // Returning placeholder for now
    return 'Scheduled according to cron pattern';
  } catch {
    return 'Unknown';
  }
}

/**
 * Get last run statistics
 */
export function getLastRunStats(): {
  lastRunTime: Date | null;
  stats: typeof lastRunStats;
} {
  return {
    lastRunTime,
    stats: lastRunStats
  };
}

/**
 * Manually trigger batch job (for testing)
 */
export async function triggerBatchJob(): Promise<void> {
  console.log('[Commission Batch] Manual trigger requested');
  await executeCommissionBatchJob();
}

/**
 * Check if job is currently running
 */
export function isBatchJobRunning(): boolean {
  return isRunning;
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Commission Batch] SIGTERM received, waiting for job to complete...');

  const checkInterval = setInterval(() => {
    if (!isRunning) {
      console.log('[Commission Batch] Job completed, exiting');
      clearInterval(checkInterval);
      process.exit(0);
    }
  }, 1000);

  // Force exit after 30 seconds
  setTimeout(() => {
    console.log('[Commission Batch] Force exit after timeout');
    clearInterval(checkInterval);
    process.exit(1);
  }, 30000);
});
