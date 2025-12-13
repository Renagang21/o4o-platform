/**
 * SchedulerService
 * Phase 19-A: Central Scheduler Infrastructure
 *
 * Core service for managing scheduled jobs:
 * - Job registration and management
 * - Cron-based execution
 * - Failure handling and retry queue
 */

import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import type { Repository, EntityManager } from 'typeorm';
import {
  ScheduledJob,
  JobStatus,
  JobTargetService,
  JobActionType,
} from '../entities/ScheduledJob.js';
import { JobExecutionLog, ExecutionResult } from '../entities/JobExecutionLog.js';
import { JobFailureQueue, FailureQueueStatus } from '../entities/JobFailureQueue.js';

/**
 * Job handler function type
 */
export type JobHandler = (
  job: ScheduledJob,
  context: JobExecutionContext
) => Promise<JobExecutionResult>;

/**
 * Context passed to job handlers
 */
export interface JobExecutionContext {
  executionId: string;
  isManualTrigger: boolean;
  triggeredBy?: string;
  entityManager: EntityManager;
}

/**
 * Result returned by job handlers
 */
export interface JobExecutionResult {
  success: boolean;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  summary?: string;
  error?: Error;
  details?: {
    affectedIds?: string[];
    failedItems?: Array<{ id: string; reason: string }>;
    [key: string]: any;
  };
}

/**
 * Options for creating a job
 */
export interface CreateJobOptions {
  name: string;
  description?: string;
  organizationId?: string;
  targetService: JobTargetService;
  actionType: JobActionType;
  cronExpression: string;
  timezone?: string;
  config?: ScheduledJob['config'];
  createdBy?: string;
}

/**
 * Options for listing jobs
 */
export interface ListJobsOptions {
  organizationId?: string;
  targetService?: JobTargetService;
  status?: JobStatus;
  page?: number;
  limit?: number;
}

/**
 * Options for listing failure queue
 */
export interface ListFailureQueueOptions {
  organizationId?: string;
  targetService?: JobTargetService;
  status?: FailureQueueStatus;
  page?: number;
  limit?: number;
}

class SchedulerService {
  private jobRepository: Repository<ScheduledJob> | null = null;
  private logRepository: Repository<JobExecutionLog> | null = null;
  private failureRepository: Repository<JobFailureQueue> | null = null;
  private entityManager: EntityManager | null = null;

  // Registered job handlers
  private handlers: Map<string, JobHandler> = new Map();

  // Active cron tasks
  private cronTasks: Map<string, cron.ScheduledTask> = new Map();

  // Service initialized flag
  private initialized = false;

  /**
   * Initialize service with TypeORM EntityManager
   */
  initialize(entityManager: EntityManager): void {
    this.entityManager = entityManager;
    this.jobRepository = entityManager.getRepository(ScheduledJob);
    this.logRepository = entityManager.getRepository(JobExecutionLog);
    this.failureRepository = entityManager.getRepository(JobFailureQueue);
    this.initialized = true;

    console.log('[SchedulerService] Initialized');
  }

  /**
   * Get the entity manager (for seeding operations)
   */
  getEntityManager(): EntityManager | null {
    return this.entityManager;
  }

  /**
   * Register a job handler
   */
  registerHandler(
    targetService: JobTargetService,
    actionType: JobActionType,
    handler: JobHandler
  ): void {
    const key = this.getHandlerKey(targetService, actionType);
    this.handlers.set(key, handler);
    console.log(`[SchedulerService] Registered handler: ${key}`);
  }

  /**
   * Start all active jobs
   */
  async startAllJobs(): Promise<void> {
    this.ensureInitialized();

    const activeJobs = await this.jobRepository!.find({
      where: { status: 'active' },
    });

    console.log(`[SchedulerService] Starting ${activeJobs.length} active jobs`);

    for (const job of activeJobs) {
      this.scheduleJob(job);
    }
  }

  /**
   * Stop all running cron tasks
   */
  stopAllJobs(): void {
    for (const [jobId, task] of this.cronTasks) {
      task.stop();
      console.log(`[SchedulerService] Stopped job: ${jobId}`);
    }
    this.cronTasks.clear();
  }

  /**
   * Create a new scheduled job
   */
  async createJob(options: CreateJobOptions): Promise<ScheduledJob> {
    this.ensureInitialized();

    // Validate cron expression
    if (!cron.validate(options.cronExpression)) {
      throw new Error(`Invalid cron expression: ${options.cronExpression}`);
    }

    const job = this.jobRepository!.create({
      ...options,
      timezone: options.timezone || 'Asia/Seoul',
      status: 'active',
    });

    const savedJob = await this.jobRepository!.save(job);

    // Schedule if active
    if (savedJob.status === 'active') {
      this.scheduleJob(savedJob);
    }

    return savedJob;
  }

  /**
   * Update a job
   */
  async updateJob(
    jobId: string,
    updates: Partial<CreateJobOptions> & { status?: JobStatus }
  ): Promise<ScheduledJob | null> {
    this.ensureInitialized();

    const job = await this.jobRepository!.findOne({ where: { id: jobId } });
    if (!job) return null;

    // Validate cron if changed
    if (updates.cronExpression && !cron.validate(updates.cronExpression)) {
      throw new Error(`Invalid cron expression: ${updates.cronExpression}`);
    }

    Object.assign(job, updates);
    const savedJob = await this.jobRepository!.save(job);

    // Re-schedule if needed
    this.unscheduleJob(jobId);
    if (savedJob.status === 'active') {
      this.scheduleJob(savedJob);
    }

    return savedJob;
  }

  /**
   * Delete a job
   */
  async deleteJob(jobId: string): Promise<boolean> {
    this.ensureInitialized();

    this.unscheduleJob(jobId);
    const result = await this.jobRepository!.delete(jobId);
    return (result.affected ?? 0) > 0;
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<ScheduledJob | null> {
    this.ensureInitialized();
    return this.jobRepository!.findOne({ where: { id: jobId } });
  }

  /**
   * List jobs with filters
   */
  async listJobs(options: ListJobsOptions = {}): Promise<{
    jobs: ScheduledJob[];
    total: number;
    page: number;
    limit: number;
  }> {
    this.ensureInitialized();

    const { page = 1, limit = 20 } = options;
    const where: any = {};

    if (options.organizationId) where.organizationId = options.organizationId;
    if (options.targetService) where.targetService = options.targetService;
    if (options.status) where.status = options.status;

    const [jobs, total] = await this.jobRepository!.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { jobs, total, page, limit };
  }

  /**
   * Manually trigger a job
   */
  async triggerJob(jobId: string, triggeredBy?: string): Promise<JobExecutionLog> {
    this.ensureInitialized();

    const job = await this.jobRepository!.findOne({ where: { id: jobId } });
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    return this.executeJob(job, true, triggeredBy);
  }

  /**
   * Get execution logs for a job
   */
  async getExecutionLogs(
    jobId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{
    logs: JobExecutionLog[];
    total: number;
  }> {
    this.ensureInitialized();

    const { page = 1, limit = 20 } = options;

    const [logs, total] = await this.logRepository!.findAndCount({
      where: { jobId },
      order: { startedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { logs, total };
  }

  // ============================================
  // Failure Queue Management
  // ============================================

  /**
   * Add item to failure queue
   */
  async addToFailureQueue(options: {
    jobId?: string;
    executionLogId?: string;
    organizationId?: string;
    targetService: JobTargetService;
    actionType: JobActionType;
    targetEntityId: string;
    targetEntityType: string;
    error: string;
    context?: any;
    maxRetries?: number;
    priority?: number;
  }): Promise<JobFailureQueue> {
    this.ensureInitialized();

    const item = this.failureRepository!.create({
      ...options,
      lastError: options.error,
      failedAt: new Date(),
      maxRetries: options.maxRetries ?? 3,
      priority: options.priority ?? 5,
      errorHistory: [
        {
          timestamp: new Date().toISOString(),
          message: options.error,
        },
      ],
    });

    // Calculate first retry time
    item.nextRetryAt = item.calculateNextRetryTime();

    return this.failureRepository!.save(item);
  }

  /**
   * List failure queue items
   */
  async listFailureQueue(options: ListFailureQueueOptions = {}): Promise<{
    items: JobFailureQueue[];
    total: number;
    page: number;
    limit: number;
  }> {
    this.ensureInitialized();

    const { page = 1, limit = 20 } = options;
    const where: any = {};

    if (options.organizationId) where.organizationId = options.organizationId;
    if (options.targetService) where.targetService = options.targetService;
    if (options.status) where.status = options.status;

    const [items, total] = await this.failureRepository!.findAndCount({
      where,
      order: { priority: 'ASC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  /**
   * Retry a specific failure queue item
   */
  async retryFailureItem(itemId: string): Promise<JobFailureQueue | null> {
    this.ensureInitialized();

    const item = await this.failureRepository!.findOne({ where: { id: itemId } });
    if (!item || !item.canRetry()) {
      return null;
    }

    item.status = 'retrying';
    await this.failureRepository!.save(item);

    // Get handler and execute
    const handler = this.handlers.get(
      this.getHandlerKey(item.targetService, item.actionType)
    );

    if (!handler) {
      item.recordRetryAttempt('No handler registered for this action');
      return this.failureRepository!.save(item);
    }

    // Create a minimal job for execution
    const mockJob = new ScheduledJob();
    mockJob.targetService = item.targetService;
    mockJob.actionType = item.actionType;
    mockJob.config = { singleItemId: item.targetEntityId } as any;

    try {
      const context: JobExecutionContext = {
        executionId: uuidv4(),
        isManualTrigger: true,
        entityManager: this.entityManager!,
      };

      const result = await handler(mockJob, context);

      if (result.success) {
        item.markResolved('Retry succeeded');
      } else {
        item.recordRetryAttempt(result.error?.message || 'Retry failed');
      }
    } catch (error) {
      item.recordRetryAttempt(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    return this.failureRepository!.save(item);
  }

  /**
   * Cancel a failure queue item
   */
  async cancelFailureItem(itemId: string, reason?: string): Promise<boolean> {
    this.ensureInitialized();

    const result = await this.failureRepository!.update(itemId, {
      status: 'cancelled',
      resolutionNotes: reason || 'Manually cancelled',
      resolvedAt: new Date(),
    });

    return (result.affected ?? 0) > 0;
  }

  /**
   * Process pending retry items (called by cron)
   */
  async processRetryQueue(): Promise<number> {
    this.ensureInitialized();

    const now = new Date();
    const pendingItems = await this.failureRepository!.find({
      where: {
        status: 'pending',
      },
      order: { priority: 'ASC', nextRetryAt: 'ASC' },
      take: 10, // Process 10 at a time
    });

    // Filter items where nextRetryAt <= now
    const dueItems = pendingItems.filter(
      (item) => item.nextRetryAt && item.nextRetryAt <= now
    );

    let processed = 0;
    for (const item of dueItems) {
      await this.retryFailureItem(item.id);
      processed++;
    }

    return processed;
  }

  // ============================================
  // Private Methods
  // ============================================

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('SchedulerService not initialized. Call initialize() first.');
    }
  }

  private getHandlerKey(
    targetService: JobTargetService,
    actionType: JobActionType
  ): string {
    return `${targetService}:${actionType}`;
  }

  private scheduleJob(job: ScheduledJob): void {
    if (this.cronTasks.has(job.id)) {
      return; // Already scheduled
    }

    const task = cron.schedule(
      job.cronExpression,
      async () => {
        await this.executeJob(job, false);
      },
      {
        timezone: job.timezone || 'Asia/Seoul',
      }
    );

    this.cronTasks.set(job.id, task);
    console.log(`[SchedulerService] Scheduled job: ${job.name} (${job.cronExpression})`);
  }

  private unscheduleJob(jobId: string): void {
    const task = this.cronTasks.get(jobId);
    if (task) {
      task.stop();
      this.cronTasks.delete(jobId);
    }
  }

  private async executeJob(
    job: ScheduledJob,
    isManualTrigger: boolean,
    triggeredBy?: string
  ): Promise<JobExecutionLog> {
    const executionId = uuidv4();
    const startedAt = new Date();

    // Create execution log
    const log = this.logRepository!.create({
      jobId: job.id,
      startedAt,
      isManualTrigger,
      triggeredBy,
      result: 'success', // Will be updated
      itemsProcessed: 0,
      itemsSucceeded: 0,
      itemsFailed: 0,
    });

    try {
      // Get handler
      const handler = this.handlers.get(
        this.getHandlerKey(job.targetService, job.actionType)
      );

      if (!handler) {
        throw new Error(
          `No handler registered for ${job.targetService}:${job.actionType}`
        );
      }

      // Execute handler
      const context: JobExecutionContext = {
        executionId,
        isManualTrigger,
        triggeredBy,
        entityManager: this.entityManager!,
      };

      const result = await handler(job, context);

      // Update log with results
      log.completedAt = new Date();
      log.durationMs = log.completedAt.getTime() - startedAt.getTime();
      log.itemsProcessed = result.itemsProcessed;
      log.itemsSucceeded = result.itemsSucceeded;
      log.itemsFailed = result.itemsFailed;
      log.summary = result.summary;
      log.details = result.details;

      if (!result.success) {
        log.result = result.itemsSucceeded > 0 ? 'partial' : 'failure';
        log.errorMessage = result.error?.message;
        log.errorStack = result.error?.stack;
      } else {
        log.result = 'success';
      }

      // Update job stats
      await this.jobRepository!.update(job.id, {
        lastExecutedAt: startedAt,
        lastExecutionResult: log.result as any,
        executionCount: () => 'execution_count + 1',
        failureCount:
          log.result === 'failure'
            ? () => 'failure_count + 1'
            : job.failureCount,
      });
    } catch (error) {
      log.completedAt = new Date();
      log.durationMs = log.completedAt.getTime() - startedAt.getTime();
      log.result = 'failure';
      log.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.errorStack = error instanceof Error ? error.stack : undefined;

      // Update job failure count
      await this.jobRepository!.update(job.id, {
        lastExecutedAt: startedAt,
        lastExecutionResult: 'failure',
        executionCount: () => 'execution_count + 1',
        failureCount: () => 'failure_count + 1',
      });
    }

    return this.logRepository!.save(log);
  }
}

// Export singleton
export const schedulerService = new SchedulerService();

// Export class for testing
export { SchedulerService };
