/**
 * Batch Job Service (Phase 2.4)
 * Manages manual batch job triggers and monitoring
 */

import { triggerBatchJob as triggerCommissionBatch, getLastRunStats, isBatchJobRunning } from '../jobs/commission-batch.job.js';
import logger from '../utils/logger.js';

// Supported batch job types
export enum BatchJobType {
  COMMISSION_AUTO_CONFIRM = 'commission-auto-confirm',
}

// Job type whitelist for validation
const ALLOWED_JOB_TYPES = Object.values(BatchJobType);

export interface BatchJobResult {
  success: boolean;
  message: string;
  jobType: string;
  triggeredAt?: string;
  estimatedTargets?: number;
}

export interface BatchJobStatus {
  jobType: string;
  isRunning: boolean;
  lastRunTime: Date | null;
  lastRunStats: {
    total: number;
    confirmed: number;
    failed: number;
    duration: number;
  } | null;
}

class BatchJobService {
  /**
   * Trigger batch job manually
   * @param jobType Job type to trigger
   * @param userId Admin/operator user ID for audit
   * @returns Promise<BatchJobResult>
   */
  async triggerManual(jobType: string, userId: string): Promise<BatchJobResult> {
    try {
      // Validate job type
      if (!ALLOWED_JOB_TYPES.includes(jobType as BatchJobType)) {
        logger.warn(`Invalid batch job type requested: ${jobType}`, { userId });
        return {
          success: false,
          message: `Invalid job type. Allowed types: ${ALLOWED_JOB_TYPES.join(', ')}`,
          jobType
        };
      }

      // Check if job is already running
      if (this.isJobRunning(jobType)) {
        logger.warn(`Batch job already running: ${jobType}`, { userId });
        return {
          success: false,
          message: 'Job is already running. Please wait for it to complete.',
          jobType
        };
      }

      // Trigger based on job type
      let result: BatchJobResult;

      switch (jobType) {
        case BatchJobType.COMMISSION_AUTO_CONFIRM:
          result = await this.triggerCommissionBatch(userId);
          break;

        default:
          result = {
            success: false,
            message: `Job type not implemented: ${jobType}`,
            jobType
          };
      }

      return result;
    } catch (error: any) {
      logger.error(`Failed to trigger batch job:`, {
        jobType,
        userId,
        error: error.message,
      });
      return {
        success: false,
        message: `Failed to trigger job: ${error.message}`,
        jobType
      };
    }
  }

  /**
   * Trigger commission auto-confirm batch job
   * @param userId Admin/operator user ID
   * @returns Promise<BatchJobResult>
   */
  private async triggerCommissionBatch(userId: string): Promise<BatchJobResult> {
    try {
      logger.info(`Manual commission batch job triggered`, { userId });

      // Trigger the job (non-blocking)
      triggerCommissionBatch().catch(err => {
        logger.error('Commission batch job failed:', err);
      });

      return {
        success: true,
        message: 'Commission batch job triggered successfully',
        jobType: BatchJobType.COMMISSION_AUTO_CONFIRM,
        triggeredAt: new Date().toISOString()
      };
    } catch (error: any) {
      logger.error('Failed to trigger commission batch:', error);
      return {
        success: false,
        message: error.message,
        jobType: BatchJobType.COMMISSION_AUTO_CONFIRM
      };
    }
  }

  /**
   * Check if a specific job is currently running
   * @param jobType Job type to check
   * @returns boolean
   */
  isJobRunning(jobType: string): boolean {
    switch (jobType) {
      case BatchJobType.COMMISSION_AUTO_CONFIRM:
        return isBatchJobRunning();
      default:
        return false;
    }
  }

  /**
   * Get job status and statistics
   * @param jobType Job type to query
   * @returns BatchJobStatus | null
   */
  getJobStatus(jobType: string): BatchJobStatus | null {
    if (!ALLOWED_JOB_TYPES.includes(jobType as BatchJobType)) {
      return null;
    }

    switch (jobType) {
      case BatchJobType.COMMISSION_AUTO_CONFIRM:
        const { lastRunTime, stats } = getLastRunStats();
        return {
          jobType,
          isRunning: isBatchJobRunning(),
          lastRunTime,
          lastRunStats: stats
        };

      default:
        return null;
    }
  }

  /**
   * Get all job statuses
   * @returns Array<BatchJobStatus>
   */
  getAllJobStatuses(): Array<BatchJobStatus> {
    return ALLOWED_JOB_TYPES.map(jobType => this.getJobStatus(jobType)).filter(Boolean) as Array<BatchJobStatus>;
  }

  /**
   * Get supported job types
   * @returns Array<string>
   */
  getSupportedJobTypes(): Array<string> {
    return ALLOWED_JOB_TYPES;
  }
}

// Export singleton instance
export const batchJobService = new BatchJobService();
