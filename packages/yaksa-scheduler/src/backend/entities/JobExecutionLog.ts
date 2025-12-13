/**
 * JobExecutionLog Entity
 * Phase 19-A: Central Scheduler Infrastructure
 *
 * Records every execution of a scheduled job for audit and debugging.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ScheduledJob } from './ScheduledJob.js';

/**
 * Execution result status
 */
export type ExecutionResult = 'success' | 'failure' | 'partial' | 'skipped';

@Entity('job_execution_logs')
@Index(['jobId', 'startedAt'])
@Index(['result', 'startedAt'])
export class JobExecutionLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Reference to the scheduled job
   */
  @Column({ type: 'uuid' })
  @Index()
  jobId!: string;

  @ManyToOne(() => ScheduledJob, (job) => job.executionLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobId' })
  job?: ScheduledJob;

  /**
   * Execution result
   */
  @Column({ type: 'varchar', length: 20 })
  result!: ExecutionResult;

  /**
   * Execution start time
   */
  @Column({ type: 'timestamp' })
  startedAt!: Date;

  /**
   * Execution end time
   */
  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  /**
   * Duration in milliseconds
   */
  @Column({ type: 'int', nullable: true })
  durationMs?: number;

  /**
   * Number of items processed
   */
  @Column({ type: 'int', default: 0 })
  itemsProcessed!: number;

  /**
   * Number of items succeeded
   */
  @Column({ type: 'int', default: 0 })
  itemsSucceeded!: number;

  /**
   * Number of items failed
   */
  @Column({ type: 'int', default: 0 })
  itemsFailed!: number;

  /**
   * Execution summary message
   */
  @Column({ type: 'text', nullable: true })
  summary?: string;

  /**
   * Error message if failed
   */
  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  /**
   * Error stack trace if available
   */
  @Column({ type: 'text', nullable: true })
  errorStack?: string;

  /**
   * Detailed execution log/output
   */
  @Column({ type: 'jsonb', nullable: true })
  details?: {
    // List of affected item IDs
    affectedIds?: string[];
    // Failed items with reasons
    failedItems?: Array<{
      id: string;
      reason: string;
    }>;
    // Any additional metadata
    [key: string]: any;
  };

  /**
   * Was this a manual trigger (vs scheduled)?
   */
  @Column({ type: 'boolean', default: false })
  isManualTrigger!: boolean;

  /**
   * User who triggered (if manual)
   */
  @Column({ type: 'uuid', nullable: true })
  triggeredBy?: string;

  @CreateDateColumn()
  createdAt!: Date;

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Calculate duration if both times are set
   */
  calculateDuration(): number | null {
    if (this.startedAt && this.completedAt) {
      return this.completedAt.getTime() - this.startedAt.getTime();
    }
    return null;
  }

  /**
   * Get success rate as percentage
   */
  getSuccessRate(): number {
    if (this.itemsProcessed === 0) return 100;
    return Math.round((this.itemsSucceeded / this.itemsProcessed) * 100);
  }

  /**
   * Format duration for display
   */
  getFormattedDuration(): string {
    const ms = this.durationMs ?? this.calculateDuration();
    if (ms === null) return 'N/A';

    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }
}
