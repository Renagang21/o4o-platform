/**
 * Scheduler Controller
 * Phase 19-A: Central Scheduler Infrastructure
 * Phase 19-C: Integrated Admin Dashboard
 * Phase 19-E: Job Seeding & Notifications
 *
 * Admin API endpoints for scheduler management.
 */

import type { Router, Request, Response } from 'express';
import { schedulerService, ListJobsOptions, ListFailureQueueOptions } from '../services/SchedulerService.js';
import { jobMonitorService } from '../services/JobMonitorService.js';
import { integratedDashboardService } from '../services/IntegratedDashboardService.js';
import { notificationService } from '../services/NotificationService.js';
import { seedJobsForOrganization } from '../../lifecycle/install.js';
import type { JobStatus, JobTargetService, JobActionType } from '../entities/ScheduledJob.js';
import type { FailureQueueStatus } from '../entities/JobFailureQueue.js';

/**
 * Create scheduler routes
 */
export function createSchedulerRoutes(router: Router): void {
  // ============================================
  // Integrated Dashboard (Phase 19-C)
  // ============================================

  /**
   * GET /yaksa-scheduler/integrated-dashboard
   * Get unified dashboard data from all Yaksa services
   */
  router.get('/integrated-dashboard', async (req: Request, res: Response) => {
    try {
      const organizationId = req.query.organizationId as string;
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          error: 'organizationId is required',
        });
      }

      const data = await integratedDashboardService.getDashboardData(organizationId);
      res.json({ success: true, data });
    } catch (error) {
      console.error('[Scheduler] Integrated dashboard error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /yaksa-scheduler/integrated-dashboard/:widget
   * Get specific widget data
   */
  router.get('/integrated-dashboard/:widget', async (req: Request, res: Response) => {
    try {
      const organizationId = req.query.organizationId as string;
      const { widget } = req.params;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          error: 'organizationId is required',
        });
      }

      let data;
      switch (widget) {
        case 'overdue-invoices':
          data = await integratedDashboardService.getOverdueInvoices(organizationId);
          break;
        case 'expiring-verifications':
          data = await integratedDashboardService.getExpiringVerifications(organizationId);
          break;
        case 'pending-assignments':
          data = await integratedDashboardService.getPendingAssignments(organizationId);
          break;
        case 'pending-reports':
          data = await integratedDashboardService.getPendingReports(organizationId);
          break;
        case 'failure-queue':
          data = await integratedDashboardService.getFailureQueue(organizationId);
          break;
        case 'scheduler-health':
          data = await integratedDashboardService.getSchedulerHealth(organizationId);
          break;
        default:
          return res.status(404).json({
            success: false,
            error: `Unknown widget: ${widget}`,
          });
      }

      res.json({ success: true, data });
    } catch (error) {
      console.error('[Scheduler] Widget error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================
  // Dashboard & Monitoring
  // ============================================

  /**
   * GET /yaksa-scheduler/dashboard
   * Get dashboard statistics
   */
  router.get('/dashboard', async (req: Request, res: Response) => {
    try {
      const organizationId = req.query.organizationId as string | undefined;
      const stats = await jobMonitorService.getDashboardStats(organizationId);
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('[Scheduler] Dashboard error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /yaksa-scheduler/health
   * Get health status for all jobs
   */
  router.get('/health', async (req: Request, res: Response) => {
    try {
      const organizationId = req.query.organizationId as string | undefined;
      const health = await jobMonitorService.getJobsHealth(organizationId);
      res.json({ success: true, data: health });
    } catch (error) {
      console.error('[Scheduler] Health check error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /yaksa-scheduler/stats
   * Get execution statistics
   */
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const organizationId = req.query.organizationId as string | undefined;
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : new Date();
      const groupBy = (req.query.groupBy as 'hour' | 'day' | 'week') || 'day';

      const stats = await jobMonitorService.getExecutionStats({
        organizationId,
        startDate,
        endDate,
        groupBy,
      });

      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('[Scheduler] Stats error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================
  // Job Management
  // ============================================

  /**
   * GET /yaksa-scheduler/jobs
   * List all jobs
   */
  router.get('/jobs', async (req: Request, res: Response) => {
    try {
      const options: ListJobsOptions = {
        organizationId: req.query.organizationId as string | undefined,
        targetService: req.query.targetService as JobTargetService | undefined,
        status: req.query.status as JobStatus | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };

      const result = await schedulerService.listJobs(options);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[Scheduler] List jobs error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /yaksa-scheduler/jobs/:id
   * Get single job
   */
  router.get('/jobs/:id', async (req: Request, res: Response) => {
    try {
      const job = await schedulerService.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found' });
      }
      res.json({ success: true, data: job });
    } catch (error) {
      console.error('[Scheduler] Get job error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /yaksa-scheduler/jobs
   * Create new job
   */
  router.post('/jobs', async (req: Request, res: Response) => {
    try {
      const {
        name,
        description,
        organizationId,
        targetService,
        actionType,
        cronExpression,
        timezone,
        config,
      } = req.body;

      // Validate required fields
      if (!name || !targetService || !actionType || !cronExpression) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, targetService, actionType, cronExpression',
        });
      }

      const job = await schedulerService.createJob({
        name,
        description,
        organizationId,
        targetService,
        actionType,
        cronExpression,
        timezone,
        config,
        createdBy: (req as any).user?.id,
      });

      res.status(201).json({ success: true, data: job });
    } catch (error) {
      console.error('[Scheduler] Create job error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * PATCH /yaksa-scheduler/jobs/:id
   * Update job
   */
  router.patch('/jobs/:id', async (req: Request, res: Response) => {
    try {
      const job = await schedulerService.updateJob(req.params.id, req.body);
      if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found' });
      }
      res.json({ success: true, data: job });
    } catch (error) {
      console.error('[Scheduler] Update job error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * DELETE /yaksa-scheduler/jobs/:id
   * Delete job
   */
  router.delete('/jobs/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await schedulerService.deleteJob(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Job not found' });
      }
      res.json({ success: true, message: 'Job deleted' });
    } catch (error) {
      console.error('[Scheduler] Delete job error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /yaksa-scheduler/jobs/:id/trigger
   * Manually trigger a job
   */
  router.post('/jobs/:id/trigger', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const log = await schedulerService.triggerJob(req.params.id, userId);
      res.json({ success: true, data: log });
    } catch (error) {
      console.error('[Scheduler] Trigger job error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /yaksa-scheduler/jobs/:id/pause
   * Pause a job
   */
  router.post('/jobs/:id/pause', async (req: Request, res: Response) => {
    try {
      const job = await schedulerService.updateJob(req.params.id, { status: 'paused' });
      if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found' });
      }
      res.json({ success: true, data: job });
    } catch (error) {
      console.error('[Scheduler] Pause job error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /yaksa-scheduler/jobs/:id/resume
   * Resume a paused job
   */
  router.post('/jobs/:id/resume', async (req: Request, res: Response) => {
    try {
      const job = await schedulerService.updateJob(req.params.id, { status: 'active' });
      if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found' });
      }
      res.json({ success: true, data: job });
    } catch (error) {
      console.error('[Scheduler] Resume job error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /yaksa-scheduler/jobs/:id/logs
   * Get execution logs for a job
   */
  router.get('/jobs/:id/logs', async (req: Request, res: Response) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await schedulerService.getExecutionLogs(req.params.id, {
        page,
        limit,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[Scheduler] Get logs error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================
  // Failure Queue Management
  // ============================================

  /**
   * GET /yaksa-scheduler/failures
   * List failure queue items
   */
  router.get('/failures', async (req: Request, res: Response) => {
    try {
      const options: ListFailureQueueOptions = {
        organizationId: req.query.organizationId as string | undefined,
        targetService: req.query.targetService as JobTargetService | undefined,
        status: req.query.status as FailureQueueStatus | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };

      const result = await schedulerService.listFailureQueue(options);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[Scheduler] List failures error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /yaksa-scheduler/failures/:id/retry
   * Retry a failure queue item
   */
  router.post('/failures/:id/retry', async (req: Request, res: Response) => {
    try {
      const item = await schedulerService.retryFailureItem(req.params.id);
      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Item not found or cannot be retried',
        });
      }
      res.json({ success: true, data: item });
    } catch (error) {
      console.error('[Scheduler] Retry failure error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /yaksa-scheduler/failures/:id/cancel
   * Cancel a failure queue item
   */
  router.post('/failures/:id/cancel', async (req: Request, res: Response) => {
    try {
      const reason = req.body.reason as string | undefined;
      const cancelled = await schedulerService.cancelFailureItem(req.params.id, reason);
      if (!cancelled) {
        return res.status(404).json({ success: false, error: 'Item not found' });
      }
      res.json({ success: true, message: 'Item cancelled' });
    } catch (error) {
      console.error('[Scheduler] Cancel failure error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /yaksa-scheduler/failures/process
   * Process pending retry queue (admin trigger)
   */
  router.post('/failures/process', async (req: Request, res: Response) => {
    try {
      const processed = await schedulerService.processRetryQueue();
      res.json({ success: true, data: { processed } });
    } catch (error) {
      console.error('[Scheduler] Process queue error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================
  // Job Seeding (Phase 19-E)
  // ============================================

  /**
   * POST /yaksa-scheduler/seed-jobs
   * Seed default jobs for an organization
   */
  router.post('/seed-jobs', async (req: Request, res: Response) => {
    try {
      const { organizationId } = req.body;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          error: 'organizationId is required',
        });
      }

      // Get entity manager from scheduler service
      const entityManager = schedulerService.getEntityManager();
      if (!entityManager) {
        return res.status(500).json({
          success: false,
          error: 'Database not initialized',
        });
      }

      const result = await seedJobsForOrganization(entityManager, organizationId);

      res.json({
        success: true,
        data: result,
        message: `Created ${result.created} jobs, skipped ${result.skipped} existing jobs`,
      });
    } catch (error) {
      console.error('[Scheduler] Seed jobs error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================
  // Admin Alerts (Phase 19-E)
  // ============================================

  /**
   * GET /yaksa-scheduler/alerts
   * Get admin alerts
   */
  router.get('/alerts', async (req: Request, res: Response) => {
    try {
      const organizationId = req.query.organizationId as string | undefined;
      const unreadOnly = req.query.unreadOnly === 'true';
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const alerts = notificationService.getAdminAlerts(organizationId, {
        unreadOnly,
        limit,
      });

      const unreadCount = notificationService.getUnreadAlertCount(organizationId);

      res.json({
        success: true,
        data: {
          alerts,
          unreadCount,
        },
      });
    } catch (error) {
      console.error('[Scheduler] Get alerts error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /yaksa-scheduler/alerts/:id/read
   * Mark alert as read
   */
  router.post('/alerts/:id/read', async (req: Request, res: Response) => {
    try {
      const success = notificationService.markAlertAsRead(req.params.id);
      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Alert not found',
        });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('[Scheduler] Mark alert read error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /yaksa-scheduler/alerts/read-all
   * Mark all alerts as read
   */
  router.post('/alerts/read-all', async (req: Request, res: Response) => {
    try {
      const organizationId = req.body.organizationId as string | undefined;
      const count = notificationService.markAllAlertsAsRead(organizationId);
      res.json({
        success: true,
        data: { markedAsRead: count },
      });
    } catch (error) {
      console.error('[Scheduler] Mark all alerts read error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
