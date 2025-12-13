/**
 * ScheduledJob Entity
 * Phase 19-A: Central Scheduler Infrastructure
 *
 * Defines scheduled jobs that can be executed on a cron schedule.
 * Jobs are organization-scoped and can target specific Yaksa services.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import type { JobExecutionLog } from './JobExecutionLog.js';

/**
 * Job status
 */
export type JobStatus = 'active' | 'paused' | 'disabled' | 'error';

/**
 * Target service types for scheduling
 */
export type JobTargetService =
  | 'annualfee-yaksa'
  | 'membership-yaksa'
  | 'lms-yaksa'
  | 'reporting-yaksa'
  | 'forum-yaksa';

/**
 * Job action types
 */
export type JobActionType =
  // Annualfee actions
  | 'invoice_overdue_check'
  | 'exemption_expiry_check'
  | 'settlement_reminder'
  // Membership actions
  | 'verification_expiry_check'
  | 'license_renewal_reminder'
  // LMS actions
  | 'assignment_expiry_check'
  | 'course_deadline_reminder'
  // Reporting actions
  | 'failed_submission_retry'
  | 'report_deadline_reminder'
  // Generic
  | 'custom';

@Entity('scheduled_jobs')
@Index(['organizationId', 'status'])
@Index(['targetService', 'actionType'])
export class ScheduledJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Human-readable job name
   */
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  /**
   * Job description
   */
  @Column({ type: 'text', nullable: true })
  description?: string;

  /**
   * Organization this job belongs to (null = global job)
   */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  organizationId?: string;

  /**
   * Target service for this job
   */
  @Column({ type: 'varchar', length: 50 })
  targetService!: JobTargetService;

  /**
   * Action type to perform
   */
  @Column({ type: 'varchar', length: 50 })
  actionType!: JobActionType;

  /**
   * Cron expression for scheduling
   * Examples: "0 9 * * *" (daily 9am), "0 0 * * 1" (weekly Monday)
   */
  @Column({ type: 'varchar', length: 100 })
  cronExpression!: string;

  /**
   * Timezone for cron execution (default: Asia/Seoul)
   */
  @Column({ type: 'varchar', length: 50, default: 'Asia/Seoul' })
  timezone!: string;

  /**
   * Job status
   */
  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: JobStatus;

  /**
   * Additional configuration for the job
   */
  @Column({ type: 'jsonb', nullable: true })
  config?: {
    // For overdue check
    overdueThresholdDays?: number;
    // For expiry check
    expiryWarningDays?: number;
    // For retry
    maxRetries?: number;
    retryDelayMinutes?: number;
    // For notifications
    notifyOnSuccess?: boolean;
    notifyOnFailure?: boolean;
    notifyEmails?: string[];
    // Custom handler
    customHandlerName?: string;
  };

  /**
   * Last execution time
   */
  @Column({ type: 'timestamp', nullable: true })
  lastExecutedAt?: Date;

  /**
   * Last execution result
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  lastExecutionResult?: 'success' | 'failure' | 'partial';

  /**
   * Next scheduled execution time
   */
  @Column({ type: 'timestamp', nullable: true })
  nextExecutionAt?: Date;

  /**
   * Execution count
   */
  @Column({ type: 'int', default: 0 })
  executionCount!: number;

  /**
   * Failure count
   */
  @Column({ type: 'int', default: 0 })
  failureCount!: number;

  /**
   * Created by user
   */
  @Column({ type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  /**
   * Execution logs (loaded via relation)
   */
  @OneToMany('JobExecutionLog', 'job')
  executionLogs?: JobExecutionLog[];

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Check if job is active and should run
   */
  isRunnable(): boolean {
    return this.status === 'active';
  }

  /**
   * Get display name for target service
   */
  getTargetServiceName(): string {
    const names: Record<JobTargetService, string> = {
      'annualfee-yaksa': '연회비 관리',
      'membership-yaksa': '회원 관리',
      'lms-yaksa': '교육 관리',
      'reporting-yaksa': '보고서 관리',
      'forum-yaksa': '게시판 관리',
    };
    return names[this.targetService] || this.targetService;
  }

  /**
   * Get display name for action type
   */
  getActionTypeName(): string {
    const names: Record<JobActionType, string> = {
      invoice_overdue_check: '미납 청구서 체크',
      exemption_expiry_check: '감면 만료 체크',
      settlement_reminder: '정산 알림',
      verification_expiry_check: '면허 검증 만료 체크',
      license_renewal_reminder: '면허 갱신 알림',
      assignment_expiry_check: '교육 배정 만료 체크',
      course_deadline_reminder: '교육 마감 알림',
      failed_submission_retry: '실패 제출 재시도',
      report_deadline_reminder: '보고서 마감 알림',
      custom: '사용자 정의',
    };
    return names[this.actionType] || this.actionType;
  }
}
