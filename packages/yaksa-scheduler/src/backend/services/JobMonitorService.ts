/**
 * JobMonitorService
 * Phase 19-A: Central Scheduler Infrastructure
 *
 * Monitoring and statistics service for scheduler jobs.
 */

import type { Repository, EntityManager } from 'typeorm';
import { ScheduledJob, JobTargetService } from '../entities/ScheduledJob.js';
import { JobExecutionLog } from '../entities/JobExecutionLog.js';
import { JobFailureQueue } from '../entities/JobFailureQueue.js';

/**
 * Dashboard statistics
 */
export interface SchedulerDashboardStats {
  totalJobs: number;
  activeJobs: number;
  pausedJobs: number;
  errorJobs: number;
  todayExecutions: number;
  todaySuccesses: number;
  todayFailures: number;
  pendingRetries: number;
  exhaustedRetries: number;
  jobsByService: Record<JobTargetService, number>;
  recentExecutions: JobExecutionLog[];
  criticalAlerts: CriticalAlert[];
}

/**
 * Critical alert definition
 */
export interface CriticalAlert {
  type: 'consecutive_failures' | 'exhausted_retries' | 'job_error';
  severity: 'warning' | 'error' | 'critical';
  jobId?: string;
  jobName?: string;
  message: string;
  timestamp: Date;
}

/**
 * Job health status
 */
export interface JobHealthStatus {
  jobId: string;
  jobName: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastExecution?: Date;
  lastResult?: string;
  recentSuccessRate: number;
  consecutiveFailures: number;
  pendingRetryCount: number;
}

class JobMonitorService {
  private jobRepository: Repository<ScheduledJob> | null = null;
  private logRepository: Repository<JobExecutionLog> | null = null;
  private failureRepository: Repository<JobFailureQueue> | null = null;
  private initialized = false;

  /**
   * Initialize service with EntityManager
   */
  initialize(entityManager: EntityManager): void {
    this.jobRepository = entityManager.getRepository(ScheduledJob);
    this.logRepository = entityManager.getRepository(JobExecutionLog);
    this.failureRepository = entityManager.getRepository(JobFailureQueue);
    this.initialized = true;
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(organizationId?: string): Promise<SchedulerDashboardStats> {
    this.ensureInitialized();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get job counts
    const jobWhere: any = {};
    if (organizationId) jobWhere.organizationId = organizationId;

    const [
      totalJobs,
      activeJobs,
      pausedJobs,
      errorJobs,
    ] = await Promise.all([
      this.jobRepository!.count({ where: jobWhere }),
      this.jobRepository!.count({ where: { ...jobWhere, status: 'active' } }),
      this.jobRepository!.count({ where: { ...jobWhere, status: 'paused' } }),
      this.jobRepository!.count({ where: { ...jobWhere, status: 'error' } }),
    ]);

    // Get today's execution counts
    const todayLogsQuery = this.logRepository!
      .createQueryBuilder('log')
      .innerJoin('log.job', 'job')
      .where('log.startedAt >= :today', { today });

    if (organizationId) {
      todayLogsQuery.andWhere('job.organizationId = :orgId', { orgId: organizationId });
    }

    const todayLogs = await todayLogsQuery.getMany();
    const todayExecutions = todayLogs.length;
    const todaySuccesses = todayLogs.filter(l => l.result === 'success').length;
    const todayFailures = todayLogs.filter(l => l.result === 'failure').length;

    // Get failure queue counts
    const failureWhere: any = {};
    if (organizationId) failureWhere.organizationId = organizationId;

    const [pendingRetries, exhaustedRetries] = await Promise.all([
      this.failureRepository!.count({
        where: { ...failureWhere, status: 'pending' },
      }),
      this.failureRepository!.count({
        where: { ...failureWhere, status: 'exhausted' },
      }),
    ]);

    // Get jobs by service
    const jobsByServiceRaw = await this.jobRepository!
      .createQueryBuilder('job')
      .select('job.targetService', 'service')
      .addSelect('COUNT(*)', 'count')
      .where(jobWhere.organizationId ? 'job.organizationId = :orgId' : '1=1', {
        orgId: organizationId,
      })
      .groupBy('job.targetService')
      .getRawMany();

    const jobsByService: Record<JobTargetService, number> = {
      'annualfee-yaksa': 0,
      'membership-yaksa': 0,
      'lms-yaksa': 0,
      'reporting-yaksa': 0,
      'forum-yaksa': 0,
    };
    jobsByServiceRaw.forEach((r) => {
      jobsByService[r.service as JobTargetService] = parseInt(r.count, 10);
    });

    // Get recent executions
    const recentExecutionsQuery = this.logRepository!
      .createQueryBuilder('log')
      .innerJoinAndSelect('log.job', 'job')
      .orderBy('log.startedAt', 'DESC')
      .take(10);

    if (organizationId) {
      recentExecutionsQuery.andWhere('job.organizationId = :orgId', {
        orgId: organizationId,
      });
    }

    const recentExecutions = await recentExecutionsQuery.getMany();

    // Generate critical alerts
    const criticalAlerts = await this.generateCriticalAlerts(organizationId);

    return {
      totalJobs,
      activeJobs,
      pausedJobs,
      errorJobs,
      todayExecutions,
      todaySuccesses,
      todayFailures,
      pendingRetries,
      exhaustedRetries,
      jobsByService,
      recentExecutions,
      criticalAlerts,
    };
  }

  /**
   * Get health status for all jobs
   */
  async getJobsHealth(organizationId?: string): Promise<JobHealthStatus[]> {
    this.ensureInitialized();

    const where: any = {};
    if (organizationId) where.organizationId = organizationId;

    const jobs = await this.jobRepository!.find({ where });
    const healthStatuses: JobHealthStatus[] = [];

    for (const job of jobs) {
      // Get recent execution logs
      const recentLogs = await this.logRepository!.find({
        where: { jobId: job.id },
        order: { startedAt: 'DESC' },
        take: 10,
      });

      // Calculate success rate
      const successCount = recentLogs.filter(l => l.result === 'success').length;
      const recentSuccessRate = recentLogs.length > 0
        ? (successCount / recentLogs.length) * 100
        : 100;

      // Count consecutive failures
      let consecutiveFailures = 0;
      for (const log of recentLogs) {
        if (log.result === 'failure') {
          consecutiveFailures++;
        } else {
          break;
        }
      }

      // Get pending retry count
      const pendingRetryCount = await this.failureRepository!.count({
        where: {
          jobId: job.id,
          status: 'pending',
        },
      });

      // Determine health status
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (consecutiveFailures >= 3 || job.status === 'error') {
        status = 'unhealthy';
      } else if (consecutiveFailures >= 1 || recentSuccessRate < 80) {
        status = 'degraded';
      }

      healthStatuses.push({
        jobId: job.id,
        jobName: job.name,
        status,
        lastExecution: job.lastExecutedAt,
        lastResult: job.lastExecutionResult,
        recentSuccessRate: Math.round(recentSuccessRate),
        consecutiveFailures,
        pendingRetryCount,
      });
    }

    return healthStatuses;
  }

  /**
   * Get execution statistics for a time range
   */
  async getExecutionStats(options: {
    organizationId?: string;
    startDate: Date;
    endDate: Date;
    groupBy?: 'hour' | 'day' | 'week';
  }): Promise<{
    timePoints: string[];
    successCounts: number[];
    failureCounts: number[];
    totalItems: number[];
  }> {
    this.ensureInitialized();

    const { startDate, endDate, groupBy = 'day' } = options;

    // Build query based on groupBy
    let dateFormat: string;
    switch (groupBy) {
      case 'hour':
        dateFormat = 'YYYY-MM-DD HH24:00';
        break;
      case 'week':
        dateFormat = 'IYYY-IW'; // ISO week
        break;
      default:
        dateFormat = 'YYYY-MM-DD';
    }

    const query = this.logRepository!
      .createQueryBuilder('log')
      .select(`TO_CHAR(log.startedAt, '${dateFormat}')`, 'timePoint')
      .addSelect('SUM(CASE WHEN log.result = \'success\' THEN 1 ELSE 0 END)', 'successCount')
      .addSelect('SUM(CASE WHEN log.result = \'failure\' THEN 1 ELSE 0 END)', 'failureCount')
      .addSelect('SUM(log.itemsProcessed)', 'totalItems')
      .where('log.startedAt >= :startDate', { startDate })
      .andWhere('log.startedAt <= :endDate', { endDate })
      .groupBy('timePoint')
      .orderBy('timePoint', 'ASC');

    if (options.organizationId) {
      query
        .innerJoin('log.job', 'job')
        .andWhere('job.organizationId = :orgId', { orgId: options.organizationId });
    }

    const rawResults = await query.getRawMany();

    return {
      timePoints: rawResults.map(r => r.timePoint),
      successCounts: rawResults.map(r => parseInt(r.successCount, 10) || 0),
      failureCounts: rawResults.map(r => parseInt(r.failureCount, 10) || 0),
      totalItems: rawResults.map(r => parseInt(r.totalItems, 10) || 0),
    };
  }

  // ============================================
  // Private Methods
  // ============================================

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('JobMonitorService not initialized');
    }
  }

  private async generateCriticalAlerts(organizationId?: string): Promise<CriticalAlert[]> {
    const alerts: CriticalAlert[] = [];

    // Check for jobs with consecutive failures
    const jobsWithFailures = await this.jobRepository!.find({
      where: {
        status: 'error',
        ...(organizationId && { organizationId }),
      },
    });

    for (const job of jobsWithFailures) {
      alerts.push({
        type: 'job_error',
        severity: 'error',
        jobId: job.id,
        jobName: job.name,
        message: `작업 "${job.name}"이(가) 오류 상태입니다`,
        timestamp: job.updatedAt,
      });
    }

    // Check for exhausted retries
    const exhaustedItems = await this.failureRepository!.find({
      where: {
        status: 'exhausted',
        ...(organizationId && { organizationId }),
      },
      take: 10,
    });

    for (const item of exhaustedItems) {
      alerts.push({
        type: 'exhausted_retries',
        severity: 'critical',
        message: `${item.targetEntityType} (${item.targetEntityId}) 재시도 횟수가 소진되었습니다`,
        timestamp: item.updatedAt,
      });
    }

    // Check for jobs with 3+ consecutive failures
    const allJobs = await this.jobRepository!.find({
      where: {
        status: 'active',
        ...(organizationId && { organizationId }),
      },
    });

    for (const job of allJobs) {
      const recentLogs = await this.logRepository!.find({
        where: { jobId: job.id },
        order: { startedAt: 'DESC' },
        take: 3,
      });

      if (
        recentLogs.length >= 3 &&
        recentLogs.every(l => l.result === 'failure')
      ) {
        alerts.push({
          type: 'consecutive_failures',
          severity: 'warning',
          jobId: job.id,
          jobName: job.name,
          message: `작업 "${job.name}"이(가) 연속 3회 이상 실패했습니다`,
          timestamp: recentLogs[0]?.completedAt || new Date(),
        });
      }
    }

    // Sort by severity and timestamp
    const severityOrder = { critical: 0, error: 1, warning: 2 };
    alerts.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    return alerts;
  }
}

// Export singleton
export const jobMonitorService = new JobMonitorService();

// Export class for testing
export { JobMonitorService };
