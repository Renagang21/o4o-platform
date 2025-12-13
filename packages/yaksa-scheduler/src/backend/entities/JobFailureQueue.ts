/**
 * JobFailureQueue Entity
 * Phase 19-A: Central Scheduler Infrastructure
 *
 * Queue for failed job items that need retry.
 * Items are automatically retried based on configuration.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import type { JobTargetService, JobActionType } from './ScheduledJob.js';

/**
 * Failure queue item status
 */
export type FailureQueueStatus = 'pending' | 'retrying' | 'resolved' | 'exhausted' | 'cancelled';

@Entity('job_failure_queue')
@Index(['status', 'nextRetryAt'])
@Index(['targetService', 'actionType'])
@Index(['organizationId', 'status'])
export class JobFailureQueue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Original job ID (if from scheduled job)
   */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  jobId?: string;

  /**
   * Execution log ID where failure occurred
   */
  @Column({ type: 'uuid', nullable: true })
  executionLogId?: string;

  /**
   * Organization context
   */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  organizationId?: string;

  /**
   * Target service
   */
  @Column({ type: 'varchar', length: 50 })
  targetService!: JobTargetService;

  /**
   * Action type
   */
  @Column({ type: 'varchar', length: 50 })
  actionType!: JobActionType;

  /**
   * Target entity ID (e.g., report ID, invoice ID)
   */
  @Column({ type: 'uuid' })
  @Index()
  targetEntityId!: string;

  /**
   * Target entity type (e.g., 'YaksaReport', 'FeeInvoice')
   */
  @Column({ type: 'varchar', length: 100 })
  targetEntityType!: string;

  /**
   * Queue item status
   */
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: FailureQueueStatus;

  /**
   * Retry count
   */
  @Column({ type: 'int', default: 0 })
  retryCount!: number;

  /**
   * Maximum retry attempts
   */
  @Column({ type: 'int', default: 3 })
  maxRetries!: number;

  /**
   * Last error message
   */
  @Column({ type: 'text', nullable: true })
  lastError?: string;

  /**
   * Error history
   */
  @Column({ type: 'jsonb', nullable: true })
  errorHistory?: Array<{
    timestamp: string;
    message: string;
    stack?: string;
  }>;

  /**
   * Next retry scheduled time
   */
  @Column({ type: 'timestamp', nullable: true })
  nextRetryAt?: Date;

  /**
   * Last retry attempt time
   */
  @Column({ type: 'timestamp', nullable: true })
  lastRetryAt?: Date;

  /**
   * First failure time
   */
  @Column({ type: 'timestamp' })
  failedAt!: Date;

  /**
   * Resolution time (if resolved)
   */
  @Column({ type: 'timestamp', nullable: true })
  resolvedAt?: Date;

  /**
   * Resolution notes
   */
  @Column({ type: 'text', nullable: true })
  resolutionNotes?: string;

  /**
   * Additional context data
   */
  @Column({ type: 'jsonb', nullable: true })
  context?: {
    // Original request/payload
    originalPayload?: any;
    // Any additional metadata
    [key: string]: any;
  };

  /**
   * Priority (lower = higher priority)
   */
  @Column({ type: 'int', default: 5 })
  priority!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Check if item can be retried
   */
  canRetry(): boolean {
    return (
      this.status === 'pending' &&
      this.retryCount < this.maxRetries
    );
  }

  /**
   * Check if retries are exhausted
   */
  isExhausted(): boolean {
    return this.retryCount >= this.maxRetries;
  }

  /**
   * Calculate next retry time with exponential backoff
   */
  calculateNextRetryTime(baseDelayMinutes: number = 5): Date {
    // Exponential backoff: 5min, 10min, 20min, 40min...
    const delayMinutes = baseDelayMinutes * Math.pow(2, this.retryCount);
    const nextTime = new Date();
    nextTime.setMinutes(nextTime.getMinutes() + delayMinutes);
    return nextTime;
  }

  /**
   * Record a retry attempt
   */
  recordRetryAttempt(error?: string): void {
    this.retryCount++;
    this.lastRetryAt = new Date();

    if (error) {
      this.lastError = error;
      if (!this.errorHistory) {
        this.errorHistory = [];
      }
      this.errorHistory.push({
        timestamp: new Date().toISOString(),
        message: error,
      });
    }

    if (this.isExhausted()) {
      this.status = 'exhausted';
    } else {
      this.nextRetryAt = this.calculateNextRetryTime();
    }
  }

  /**
   * Mark as resolved
   */
  markResolved(notes?: string): void {
    this.status = 'resolved';
    this.resolvedAt = new Date();
    if (notes) {
      this.resolutionNotes = notes;
    }
  }

  /**
   * Get formatted status for display
   */
  getStatusDisplay(): string {
    const displays: Record<FailureQueueStatus, string> = {
      pending: '대기 중',
      retrying: '재시도 중',
      resolved: '해결됨',
      exhausted: '재시도 소진',
      cancelled: '취소됨',
    };
    return displays[this.status] || this.status;
  }
}
