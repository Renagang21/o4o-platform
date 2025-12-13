/**
 * IntegratedDashboardService
 * Phase 19-C: Integrated Admin Dashboard
 *
 * Aggregates data from all Yaksa services for unified dashboard display.
 * Provides real-time statistics for:
 * - Overdue invoices (annualfee-yaksa)
 * - Expiring verifications (membership-yaksa)
 * - Pending assignments (lms-yaksa)
 * - Pending reports (reporting-yaksa)
 * - Failure queue status (yaksa-scheduler)
 * - Scheduler health (yaksa-scheduler)
 */

import type { EntityManager } from 'typeorm';

/**
 * Dashboard widget data types
 */
export interface OverdueInvoiceWidget {
  count: number;
  totalAmount: number;
  oldestDueDate?: Date;
  items: Array<{
    id: string;
    invoiceNumber: string;
    memberName: string;
    amount: number;
    dueDate: Date;
    daysOverdue: number;
  }>;
}

export interface ExpiringVerificationWidget {
  expiringThisWeek: number;
  expiringThisMonth: number;
  alreadyExpired: number;
  items: Array<{
    id: string;
    memberName: string;
    licenseType: string;
    expiresAt: Date;
    daysUntilExpiry: number;
  }>;
}

export interface PendingAssignmentWidget {
  totalPending: number;
  overdueCount: number;
  nearDeadlineCount: number;
  items: Array<{
    id: string;
    memberName: string;
    courseName: string;
    dueDate: Date;
    status: string;
    progress: number;
  }>;
}

export interface PendingReportWidget {
  draftCount: number;
  reviewedCount: number;
  failedSubmissionCount: number;
  nearDeadlineCount: number;
  items: Array<{
    id: string;
    reportType: string;
    period: string;
    status: string;
    deadline?: Date;
  }>;
}

export interface FailureQueueWidget {
  pendingCount: number;
  exhaustedCount: number;
  recentFailures: Array<{
    id: string;
    targetService: string;
    actionType: string;
    targetEntityType: string;
    lastError: string;
    retryCount: number;
    createdAt: Date;
  }>;
}

export interface SchedulerHealthWidget {
  activeJobs: number;
  pausedJobs: number;
  errorJobs: number;
  todayExecutions: number;
  todaySuccessRate: number;
  recentExecutions: Array<{
    jobName: string;
    result: string;
    executedAt: Date;
    duration: number;
  }>;
}

/**
 * Complete dashboard data
 */
export interface IntegratedDashboardData {
  overdueInvoices: OverdueInvoiceWidget;
  expiringVerifications: ExpiringVerificationWidget;
  pendingAssignments: PendingAssignmentWidget;
  pendingReports: PendingReportWidget;
  failureQueue: FailureQueueWidget;
  schedulerHealth: SchedulerHealthWidget;
  lastUpdated: Date;
}

class IntegratedDashboardService {
  private entityManager: EntityManager | null = null;
  private initialized = false;

  /**
   * Initialize with EntityManager
   */
  initialize(entityManager: EntityManager): void {
    this.entityManager = entityManager;
    this.initialized = true;
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.entityManager) {
      throw new Error('IntegratedDashboardService not initialized');
    }
  }

  /**
   * Get complete dashboard data
   */
  async getDashboardData(organizationId: string): Promise<IntegratedDashboardData> {
    this.ensureInitialized();

    // Fetch all widgets in parallel
    const [
      overdueInvoices,
      expiringVerifications,
      pendingAssignments,
      pendingReports,
      failureQueue,
      schedulerHealth,
    ] = await Promise.all([
      this.getOverdueInvoices(organizationId),
      this.getExpiringVerifications(organizationId),
      this.getPendingAssignments(organizationId),
      this.getPendingReports(organizationId),
      this.getFailureQueue(organizationId),
      this.getSchedulerHealth(organizationId),
    ]);

    return {
      overdueInvoices,
      expiringVerifications,
      pendingAssignments,
      pendingReports,
      failureQueue,
      schedulerHealth,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get overdue invoices widget data
   */
  async getOverdueInvoices(organizationId: string): Promise<OverdueInvoiceWidget> {
    this.ensureInitialized();

    try {
      const FeeInvoice = this.entityManager!.getRepository('FeeInvoice');

      const overdueInvoices = await FeeInvoice.createQueryBuilder('invoice')
        .leftJoinAndSelect('invoice.member', 'member')
        .where('invoice.organizationId = :orgId', { orgId: organizationId })
        .andWhere('invoice.status IN (:...statuses)', { statuses: ['overdue', 'sent', 'partial'] })
        .andWhere('invoice.dueDate < :now', { now: new Date() })
        .orderBy('invoice.dueDate', 'ASC')
        .take(10)
        .getMany();

      const count = await FeeInvoice.count({
        where: {
          organizationId,
          status: 'overdue',
        },
      });

      const now = new Date();
      const items = overdueInvoices.map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber || inv.id.substring(0, 8),
        memberName: inv.member?.displayName || 'Unknown',
        amount: inv.totalAmount || 0,
        dueDate: inv.dueDate,
        daysOverdue: Math.floor((now.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
      }));

      return {
        count,
        totalAmount: items.reduce((sum, item) => sum + item.amount, 0),
        oldestDueDate: items[0]?.dueDate,
        items,
      };
    } catch {
      return {
        count: 0,
        totalAmount: 0,
        items: [],
      };
    }
  }

  /**
   * Get expiring verifications widget data
   */
  async getExpiringVerifications(organizationId: string): Promise<ExpiringVerificationWidget> {
    this.ensureInitialized();

    try {
      const Verification = this.entityManager!.getRepository('Verification');

      const now = new Date();
      const oneWeek = new Date(now);
      oneWeek.setDate(oneWeek.getDate() + 7);
      const oneMonth = new Date(now);
      oneMonth.setMonth(oneMonth.getMonth() + 1);

      // Get counts
      const [expiringThisWeek, expiringThisMonth, alreadyExpired] = await Promise.all([
        Verification.createQueryBuilder('v')
          .where('v.organizationId = :orgId', { orgId: organizationId })
          .andWhere('v.status = :status', { status: 'approved' })
          .andWhere('v.expiresAt > :now', { now })
          .andWhere('v.expiresAt <= :oneWeek', { oneWeek })
          .getCount(),
        Verification.createQueryBuilder('v')
          .where('v.organizationId = :orgId', { orgId: organizationId })
          .andWhere('v.status = :status', { status: 'approved' })
          .andWhere('v.expiresAt > :now', { now })
          .andWhere('v.expiresAt <= :oneMonth', { oneMonth })
          .getCount(),
        Verification.createQueryBuilder('v')
          .where('v.organizationId = :orgId', { orgId: organizationId })
          .andWhere('v.status = :status', { status: 'expired' })
          .getCount(),
      ]);

      // Get items expiring soon
      const expiringItems = await Verification.createQueryBuilder('v')
        .leftJoinAndSelect('v.member', 'member')
        .where('v.organizationId = :orgId', { orgId: organizationId })
        .andWhere('v.status = :status', { status: 'approved' })
        .andWhere('v.expiresAt > :now', { now })
        .andWhere('v.expiresAt <= :oneMonth', { oneMonth })
        .orderBy('v.expiresAt', 'ASC')
        .take(10)
        .getMany();

      const items = expiringItems.map((v: any) => ({
        id: v.id,
        memberName: v.member?.displayName || 'Unknown',
        licenseType: v.type || v.verificationType || 'License',
        expiresAt: v.expiresAt,
        daysUntilExpiry: Math.floor((v.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      }));

      return {
        expiringThisWeek,
        expiringThisMonth,
        alreadyExpired,
        items,
      };
    } catch {
      return {
        expiringThisWeek: 0,
        expiringThisMonth: 0,
        alreadyExpired: 0,
        items: [],
      };
    }
  }

  /**
   * Get pending course assignments widget data
   */
  async getPendingAssignments(organizationId: string): Promise<PendingAssignmentWidget> {
    this.ensureInitialized();

    try {
      const CourseAssignment = this.entityManager!.getRepository('YaksaCourseAssignment');

      const now = new Date();
      const oneWeek = new Date(now);
      oneWeek.setDate(oneWeek.getDate() + 7);

      // Get counts
      const [totalPending, overdueCount, nearDeadlineCount] = await Promise.all([
        CourseAssignment.createQueryBuilder('a')
          .where('a.organizationId = :orgId', { orgId: organizationId })
          .andWhere('a.status IN (:...statuses)', { statuses: ['pending', 'in_progress'] })
          .getCount(),
        CourseAssignment.createQueryBuilder('a')
          .where('a.organizationId = :orgId', { orgId: organizationId })
          .andWhere('a.status IN (:...statuses)', { statuses: ['pending', 'in_progress'] })
          .andWhere('a.dueDate < :now', { now })
          .getCount(),
        CourseAssignment.createQueryBuilder('a')
          .where('a.organizationId = :orgId', { orgId: organizationId })
          .andWhere('a.status IN (:...statuses)', { statuses: ['pending', 'in_progress'] })
          .andWhere('a.dueDate > :now', { now })
          .andWhere('a.dueDate <= :oneWeek', { oneWeek })
          .getCount(),
      ]);

      // Get items
      const pendingItems = await CourseAssignment.createQueryBuilder('a')
        .leftJoinAndSelect('a.member', 'member')
        .leftJoinAndSelect('a.course', 'course')
        .where('a.organizationId = :orgId', { orgId: organizationId })
        .andWhere('a.status IN (:...statuses)', { statuses: ['pending', 'in_progress'] })
        .orderBy('a.dueDate', 'ASC')
        .take(10)
        .getMany();

      const items = pendingItems.map((a: any) => ({
        id: a.id,
        memberName: a.member?.displayName || 'Unknown',
        courseName: a.course?.title || 'Unknown Course',
        dueDate: a.dueDate,
        status: a.status,
        progress: a.progress || 0,
      }));

      return {
        totalPending,
        overdueCount,
        nearDeadlineCount,
        items,
      };
    } catch {
      return {
        totalPending: 0,
        overdueCount: 0,
        nearDeadlineCount: 0,
        items: [],
      };
    }
  }

  /**
   * Get pending reports widget data
   */
  async getPendingReports(organizationId: string): Promise<PendingReportWidget> {
    this.ensureInitialized();

    try {
      const YaksaReport = this.entityManager!.getRepository('YaksaReport');

      const now = new Date();
      const oneWeek = new Date(now);
      oneWeek.setDate(oneWeek.getDate() + 7);

      // Get counts
      const [draftCount, reviewedCount, failedSubmissionCount, nearDeadlineCount] = await Promise.all([
        YaksaReport.count({
          where: { organizationId, status: 'DRAFT' },
        }),
        YaksaReport.count({
          where: { organizationId, status: 'REVIEWED' },
        }),
        YaksaReport.createQueryBuilder('r')
          .where('r.organizationId = :orgId', { orgId: organizationId })
          .andWhere('r.submissionStatus = :status', { status: 'FAILED' })
          .getCount(),
        YaksaReport.createQueryBuilder('r')
          .where('r.organizationId = :orgId', { orgId: organizationId })
          .andWhere('r.status IN (:...statuses)', { statuses: ['DRAFT', 'REVIEWED'] })
          .andWhere('r.deadline > :now', { now })
          .andWhere('r.deadline <= :oneWeek', { oneWeek })
          .getCount(),
      ]);

      // Get pending items
      const pendingItems = await YaksaReport.createQueryBuilder('r')
        .where('r.organizationId = :orgId', { orgId: organizationId })
        .andWhere('r.status IN (:...statuses)', { statuses: ['DRAFT', 'REVIEWED'] })
        .orderBy('r.deadline', 'ASC')
        .take(10)
        .getMany();

      const items = pendingItems.map((r: any) => ({
        id: r.id,
        reportType: r.type || 'Unknown',
        period: r.periodLabel || r.period || 'Unknown',
        status: r.status,
        deadline: r.deadline,
      }));

      return {
        draftCount,
        reviewedCount,
        failedSubmissionCount,
        nearDeadlineCount,
        items,
      };
    } catch {
      return {
        draftCount: 0,
        reviewedCount: 0,
        failedSubmissionCount: 0,
        nearDeadlineCount: 0,
        items: [],
      };
    }
  }

  /**
   * Get failure queue widget data
   */
  async getFailureQueue(organizationId: string): Promise<FailureQueueWidget> {
    this.ensureInitialized();

    try {
      const JobFailureQueue = this.entityManager!.getRepository('JobFailureQueue');

      const [pendingCount, exhaustedCount] = await Promise.all([
        JobFailureQueue.count({
          where: { organizationId, status: 'pending' },
        }),
        JobFailureQueue.count({
          where: { organizationId, status: 'exhausted' },
        }),
      ]);

      const recentItems = await JobFailureQueue.createQueryBuilder('f')
        .where('f.organizationId = :orgId', { orgId: organizationId })
        .andWhere('f.status IN (:...statuses)', { statuses: ['pending', 'exhausted'] })
        .orderBy('f.createdAt', 'DESC')
        .take(5)
        .getMany();

      const recentFailures = recentItems.map((f: any) => ({
        id: f.id,
        targetService: f.targetService,
        actionType: f.actionType,
        targetEntityType: f.targetEntityType,
        lastError: f.lastError || 'Unknown error',
        retryCount: f.retryCount || 0,
        createdAt: f.createdAt,
      }));

      return {
        pendingCount,
        exhaustedCount,
        recentFailures,
      };
    } catch {
      return {
        pendingCount: 0,
        exhaustedCount: 0,
        recentFailures: [],
      };
    }
  }

  /**
   * Get scheduler health widget data
   */
  async getSchedulerHealth(organizationId: string): Promise<SchedulerHealthWidget> {
    this.ensureInitialized();

    try {
      const ScheduledJob = this.entityManager!.getRepository('ScheduledJob');
      const JobExecutionLog = this.entityManager!.getRepository('JobExecutionLog');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get job counts
      const [activeJobs, pausedJobs, errorJobs] = await Promise.all([
        ScheduledJob.count({
          where: { organizationId, status: 'active' },
        }),
        ScheduledJob.count({
          where: { organizationId, status: 'paused' },
        }),
        ScheduledJob.count({
          where: { organizationId, status: 'error' },
        }),
      ]);

      // Get today's executions
      const todayLogs = await JobExecutionLog.createQueryBuilder('log')
        .innerJoin('log.job', 'job')
        .where('job.organizationId = :orgId', { orgId: organizationId })
        .andWhere('log.startedAt >= :today', { today })
        .getMany();

      const todayExecutions = todayLogs.length;
      const todaySuccesses = todayLogs.filter((l: any) => l.result === 'success').length;
      const todaySuccessRate = todayExecutions > 0 ? (todaySuccesses / todayExecutions) * 100 : 100;

      // Get recent executions
      const recentLogs = await JobExecutionLog.createQueryBuilder('log')
        .innerJoinAndSelect('log.job', 'job')
        .where('job.organizationId = :orgId', { orgId: organizationId })
        .orderBy('log.startedAt', 'DESC')
        .take(5)
        .getMany();

      const recentExecutions = recentLogs.map((log: any) => ({
        jobName: log.job?.name || 'Unknown',
        result: log.result,
        executedAt: log.startedAt,
        duration: log.durationMs || 0,
      }));

      return {
        activeJobs,
        pausedJobs,
        errorJobs,
        todayExecutions,
        todaySuccessRate: Math.round(todaySuccessRate),
        recentExecutions,
      };
    } catch {
      return {
        activeJobs: 0,
        pausedJobs: 0,
        errorJobs: 0,
        todayExecutions: 0,
        todaySuccessRate: 100,
        recentExecutions: [],
      };
    }
  }
}

// Export singleton
export const integratedDashboardService = new IntegratedDashboardService();

// Export class for testing
export { IntegratedDashboardService };
