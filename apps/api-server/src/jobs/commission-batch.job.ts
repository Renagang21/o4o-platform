import cron, { type ScheduledTask } from 'node-cron';
import { OperationsService } from '../services/OperationsService.js';
import logger from '../utils/logger.js';

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
    logger.info('[Commission Batch] ⚠️  Job already running, skipping this execution');
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  logger.info('[Commission Batch] 🚀 Starting batch confirmation job...');
  logger.info(`[Commission Batch] Time: ${new Date().toISOString()}`);

  try {
    const operationsService = new OperationsService();

    // Get event emitter for webhook notifications
    const eventEmitter = operationsService.getEventEmitter();

    // Execute batch confirmation
    const results = await operationsService.batchConfirmCommissions();

    const duration = Date.now() - startTime;
    const durationSeconds = duration / 1000;

    // Record metrics
    try {
      const { prometheusMetrics } = await import('../services/prometheus-metrics.service.js');
      const HttpMetricsService = (await import('../middleware/metrics.middleware.js')).default;
      const metricsInstance = HttpMetricsService.getInstance(prometheusMetrics.registry);

      metricsInstance.recordBatchJobRun('commission-auto-confirm', 'success', durationSeconds);
      metricsInstance.recordBatchJobItemsProcessed('commission-auto-confirm', 'success', results.confirmed);
      if (results.failed > 0) {
        metricsInstance.recordBatchJobItemsProcessed('commission-auto-confirm', 'failed', results.failed);
      }
    } catch (metricsError) {
      logger.warn('[Commission Batch] Failed to record metrics:', metricsError);
    }

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
      logger.info(`[Commission Batch] ✅ ${results.confirmed} commission.auto_confirmed events emitted`);
    }

    // Log summary
    logger.info('[Commission Batch] ✅ Job completed successfully');
    logger.info(`[Commission Batch] Total commissions processed: ${results.total}`);
    logger.info(`[Commission Batch] Confirmed: ${results.confirmed}`);
    logger.info(`[Commission Batch] Failed: ${results.failed}`);
    logger.info(`[Commission Batch] Duration: ${duration}ms`);

    // Log errors if any
    if (results.errors.length > 0) {
      logger.error(`[Commission Batch] ❌ ${results.errors.length} errors occurred:`);
      results.errors.forEach(err => {
        logger.error(`  - Commission ${err.commissionId}: ${err.error}`);
      });
    }

    // Success rate
    if (results.total > 0) {
      const successRate = (results.confirmed / results.total) * 100;
      logger.info(`[Commission Batch] Success rate: ${successRate.toFixed(2)}%`);
    }

  } catch (error) {
    logger.error('[Commission Batch] ❌ Job failed with error:', error);

    const duration = Date.now() - startTime;
    const durationSeconds = duration / 1000;

    // Record failure metrics
    try {
      const { prometheusMetrics } = await import('../services/prometheus-metrics.service.js');
      const HttpMetricsService = (await import('../middleware/metrics.middleware.js')).default;
      const metricsInstance = HttpMetricsService.getInstance(prometheusMetrics.registry);

      metricsInstance.recordBatchJobRun('commission-auto-confirm', 'failed', durationSeconds);
    } catch (metricsError) {
      logger.warn('[Commission Batch] Failed to record failure metrics:', metricsError);
    }

    // Update stats with failure
    lastRunTime = new Date();
    lastRunStats = {
      total: 0,
      confirmed: 0,
      failed: 1,
      duration
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

  logger.info('[Commission Batch] Initializing batch job...');
  logger.info(`[Commission Batch] Schedule: ${cronSchedule} (${getCronDescription(cronSchedule)})`);

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

  logger.info('[Commission Batch] ✅ Batch job initialized successfully');
  logger.info(`[Commission Batch] Timezone: ${process.env.TZ || 'Asia/Seoul'}`);
  logger.info(`[Commission Batch] Next run: ${getNextRunTime(cronSchedule)}`);

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
  logger.info('[Commission Batch] Manual trigger requested');
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
  logger.info('[Commission Batch] SIGTERM received, waiting for job to complete...');

  const checkInterval = setInterval(() => {
    if (!isRunning) {
      logger.info('[Commission Batch] Job completed, exiting');
      clearInterval(checkInterval);
      process.exit(0);
    }
  }, 1000);

  // Force exit after 30 seconds
  setTimeout(() => {
    logger.info('[Commission Batch] Force exit after timeout');
    clearInterval(checkInterval);
    process.exit(1);
  }, 30000);
});
