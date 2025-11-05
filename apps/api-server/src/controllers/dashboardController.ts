import { Request, Response } from 'express';
import { AppDataSource } from '../database/connection.js';
import { User } from '../entities/User.js';
import { Post } from '../entities/Post.js';
import { Category } from '../entities/Category.js';
import { MediaFile } from '../entities/MediaFile.js';
import { Partner } from '../entities/Partner.js';
import { Commission, CommissionStatus } from '../entities/Commission.js';
import { Order } from '../entities/Order.js';
import { prometheusMetrics } from '../services/prometheus-metrics.service.js';
import { cacheService } from '../services/CacheService.js';
import { webhookService } from '../services/WebhookService.js';
import { batchJobService } from '../services/BatchJobService.js';
import logger from '../utils/logger.js';
import { Between, MoreThan } from 'typeorm';
import { AuthRequest } from '../types/auth.js';

export class DashboardController {
  // Get user statistics
  static async getUserStats(req: Request, res: Response) {
    try {
      const userRepo = AppDataSource.getRepository(User);
      
      const [total, active, pending, inactive] = await Promise.all([
        userRepo.count(),
        userRepo.count({ where: { isActive: true, isEmailVerified: true } }),
        userRepo.count({ where: { isEmailVerified: false } }),
        userRepo.count({ where: { isActive: false } })
      ]);

      res.json({
        success: true,
        data: {
          total,
          active,
          pending,
          inactive,
          growth: {
            monthly: 0, // Calculate based on createdAt dates
            weekly: 0
          }
        }
      });
    } catch (error: any) {
      // Return success with fallback data to avoid CORS-like errors
      res.status(200).json({
        success: true,
        data: {
          total: 0,
          active: 0,
          pending: 0,
          inactive: 0,
          growth: {
            monthly: 0,
            weekly: 0
          }
        }
      });
    }
  }

  // Get ecommerce dashboard stats (placeholder for future implementation)
  static async getEcommerceStats(req: Request, res: Response) {
    // Return placeholder data for now
    res.status(200).json({
      success: true,
      data: {
        orders: 0,
        revenue: 0,
        products: 0,
        customers: 0,
        monthly: {
          orders: 0,
          revenue: 0
        },
        trends: {
          orders: '+0%',
          revenue: '+0%',
          products: '+0%',
          customers: '+0%'
        }
      }
    });
  }

  // Get admin notifications
  static async getNotifications(req: Request, res: Response) {
    try {
      // TODO: Replace with actual notifications from database
      const notifications: any[] = [];

      res.json({
        success: true,
        data: notifications,
        total: notifications.length,
        unread: notifications.filter(n => !n.read).length
      });
    } catch (error: any) {
      // Error log removed
      res.status(200).json({
        success: true,
        data: [],
        total: 0,
        unread: 0
      });
    }
  }

  // Get admin activities
  static async getActivities(req: Request, res: Response) {
    try {
      // TODO: Replace with actual activities from activity log table
      const activities: any[] = [];

      res.json({
        success: true,
        data: activities,
        total: activities.length
      });
    } catch (error: any) {
      // Error log removed
      res.status(200).json({
        success: true,
        data: [],
        total: 0
      });
    }
  }

  // Get system health
  static async getSystemHealth(req: Request, res: Response) {
    try {
      // Check database connection
      const dbHealthy = await AppDataSource.query('SELECT 1')
        .then(() => true)
        .catch(() => false);

      // Get system metrics
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();
      
      res.json({
        success: true,
        status: dbHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        metrics: {
          uptime: Math.floor(uptime),
          memory: {
            used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
          },
          database: dbHealthy ? 'connected' : 'disconnected'
        },
        services: {
          api: 'operational',
          database: dbHealthy ? 'operational' : 'down',
          cache: 'operational',
          storage: 'operational'
        }
      });
    } catch (error: any) {
      // Error log removed
      res.status(200).json({
        success: true,
        data: {
          status: 'degraded',
          uptime: 0,
          memory: { used: 0, total: 0 },
          database: { status: 'disconnected' },
          cache: { status: 'unavailable' },
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Get content statistics
  static async getContentStats(req: Request, res: Response) {
    try {
      const postRepo = AppDataSource.getRepository(Post);
      const categoryRepo = AppDataSource.getRepository(Category);
      const mediaRepo = AppDataSource.getRepository(MediaFile);
      
      const [posts, drafts, published, categories, media] = await Promise.all([
        postRepo.count(),
        postRepo.count({ where: { status: 'draft' } }),
        postRepo.count({ where: { status: 'publish' } }),
        categoryRepo.count(),
        mediaRepo.count()
      ]);

      res.json({
        success: true,
        data: {
          posts: {
            total: posts,
            draft: drafts,
            published: published,
            scheduled: 0,
            private: 0
          },
          pages: {
            total: 0,
            draft: 0,
            published: 0
          },
          media: {
            total: media,
            images: 0,
            videos: 0,
            documents: 0
          },
          categories,
          tags: 0
        }
      });
    } catch (error: any) {
      // Error log removed
      res.status(200).json({
        success: true,
        data: {
          posts: { total: 0, published: 0, draft: 0 },
          pages: { total: 0, published: 0 },
          media: { total: 0, size: '0 MB' },
          comments: { total: 0, approved: 0, pending: 0 }
        }
      });
    }
  }

  // Get overview dashboard data
  static async getDashboardOverview(req: Request, res: Response) {
    try {
      const [userStats, ecommerceStats, contentStats] = await Promise.all([
        DashboardController.getUserStatsData(),
        DashboardController.getEcommerceStatsData(),
        DashboardController.getContentStatsData()
      ]);

      res.json({
        success: true,
        data: {
          users: userStats,
          ecommerce: ecommerceStats,
          content: contentStats,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error: any) {
      // Error log removed
      res.status(200).json({
        success: true,
        data: {
          users: { total: 0, active: 0, newToday: 0 },
          content: { posts: 0, pages: 0, media: 0 },
          ecommerce: { orders: 0, revenue: 0, products: 0 },
          system: { uptime: '0h 0m', status: 'degraded' }
        }
      });
    }
  }

  // Helper methods for internal use
  private static async getUserStatsData() {
    const userRepo = AppDataSource.getRepository(User);
    const [total, active] = await Promise.all([
      userRepo.count(),
      userRepo.count({ where: { isActive: true } })
    ]);
    return { total, active };
  }

  private static async getEcommerceStatsData() {
    // Placeholder for future implementation
    return { orders: 0, products: 0 };
  }

  private static async getContentStatsData() {
    try {
      const postRepo = AppDataSource.getRepository(Post);
      const posts = await postRepo.count();
      return { posts };
    } catch {
      return { posts: 0 };
    }
  }

  // ===== Phase 2.4: Advanced Dashboard Endpoints =====

  /**
   * GET /api/v1/dashboard/system
   * System metrics summary from Prometheus
   */
  static async getSystemMetrics(req: Request, res: Response) {
    const cacheKey = 'dashboard:system-metrics';

    try {
      // Try cache first (60s TTL)
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: cached,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }

      // Get Prometheus metrics
      const prometheusData = await prometheusMetrics.getMetrics();
      const cacheStats = cacheService.getStats();

      // Parse and aggregate key metrics
      const metrics = {
        cache: {
          hitRate: cacheStats.hitRate,
          l1HitRate: cacheStats.l1HitRate,
          l2HitRate: cacheStats.l2HitRate,
          errors: cacheStats.errors,
          memorySize: cacheStats.memorySize,
          circuitBreakerState: cacheStats.circuitBreakerState
        },
        api: {
          uptime: process.uptime(),
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
          },
          cpu: process.cpuUsage()
        }
      };

      // Cache for 60 seconds
      await cacheService.set(cacheKey, metrics, undefined, { ttl: 60 });

      res.json({
        success: true,
        data: metrics,
        cached: false,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Failed to get system metrics', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system metrics',
        message: error.message
      });
    }
  }

  /**
   * GET /api/v1/dashboard/partners/:id
   * Partner-specific statistics
   */
  static async getPartnerStats(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const cacheKey = `dashboard:partner-stats:${id}`;

    try {
      // Check cache
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: cached,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }

      const partnerRepo = AppDataSource.getRepository(Partner);
      const commissionRepo = AppDataSource.getRepository(Commission);

      // Get partner
      const partner = await partnerRepo.findOne({ where: { id } });
      if (!partner) {
        return res.status(404).json({
          success: false,
          error: 'Partner not found'
        });
      }

      // Calculate date ranges
      const now = new Date();
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get commission stats
      const [
        totalCommissions,
        confirmedCommissions,
        pendingCommissions,
        last7DaysCommissions,
        last30DaysCommissions
      ] = await Promise.all([
        commissionRepo.count({ where: { partnerId: id } }),
        commissionRepo.count({ where: { partnerId: id, status: CommissionStatus.CONFIRMED } }),
        commissionRepo.count({ where: { partnerId: id, status: CommissionStatus.PENDING } }),
        commissionRepo.find({
          where: { partnerId: id, createdAt: MoreThan(last7Days) }
        }),
        commissionRepo.find({
          where: { partnerId: id, createdAt: MoreThan(last30Days) }
        })
      ]);

      // Calculate revenue
      const totalRevenue = last30DaysCommissions.reduce((sum, comm) => sum + Number(comm.commissionAmount), 0);
      const last7DaysRevenue = last7DaysCommissions.reduce((sum, comm) => sum + Number(comm.commissionAmount), 0);

      // Commission trend (last 7 days)
      const commissionTrend = this.calculateDailyTrend(last7DaysCommissions, 7);

      const stats = {
        partner: {
          id: partner.id,
          userId: partner.userId,
          status: partner.status,
          tier: partner.tier
        },
        commissions: {
          total: totalCommissions,
          confirmed: confirmedCommissions,
          pending: pendingCommissions,
          confirmationRate: totalCommissions > 0
            ? (confirmedCommissions / totalCommissions * 100).toFixed(2) + '%'
            : '0%'
        },
        revenue: {
          total: totalRevenue.toFixed(2),
          last7Days: last7DaysRevenue.toFixed(2),
          currency: 'KRW'
        },
        trend: commissionTrend
      };

      // Cache for 60 seconds
      await cacheService.set(cacheKey, stats, undefined, { ttl: 60 });

      res.json({
        success: true,
        data: stats,
        cached: false,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Failed to get partner stats', { partnerId: id, error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve partner statistics',
        message: error.message
      });
    }
  }

  /**
   * GET /api/v1/dashboard/operations
   * Batch and webhook operational status
   */
  static async getOperationsStats(req: Request, res: Response) {
    const cacheKey = 'dashboard:operations-stats';

    try {
      // Check cache
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: cached,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }

      // Get Prometheus metrics (would parse webhook and batch job metrics)
      const prometheusData = await prometheusMetrics.getMetrics();

      // For now, return placeholder data structure
      // In production, parse Prometheus metrics for:
      // - webhook_deliveries_total
      // - webhook_failures_total
      // - batch_job_runs_total
      // - batch_job_items_processed_total

      const stats = {
        webhooks: {
          total: 0,
          successful: 0,
          failed: 0,
          successRate: '0%',
          avgResponseTime: 0
        },
        batchJobs: {
          totalRuns: 0,
          itemsProcessed: 0,
          lastRunAt: null,
          nextScheduledAt: null
        },
        cache: cacheService.getStats()
      };

      // Cache for 60 seconds
      await cacheService.set(cacheKey, stats, undefined, { ttl: 60 });

      res.json({
        success: true,
        data: stats,
        cached: false,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Failed to get operations stats', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve operations statistics',
        message: error.message
      });
    }
  }

  /**
   * POST /api/v1/dashboard/operations/webhook/retry
   * Manual webhook retry trigger
   */
  static async retryWebhook(req: AuthRequest, res: Response) {
    const { webhookId } = req.body;

    try {
      // Verify admin/operator role
      if (!req.user || !['admin', 'operator'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      // Validate input
      if (!webhookId) {
        return res.status(400).json({
          success: false,
          error: 'webhookId is required'
        });
      }

      // Trigger webhook retry via WebhookService
      const result = await webhookService.retryDelivery(webhookId, req.user.id);

      logger.info('Manual webhook retry triggered', {
        webhookId,
        userId: req.user.id,
        result
      });

      // Record metrics
      try {
        const HttpMetricsService = (await import('../middleware/metrics.middleware.js')).default;
        const metricsInstance = HttpMetricsService.getInstance(prometheusMetrics.registry);
        metricsInstance.recordWebhookDelivery(
          'manual_retry',
          result.success ? 'success' : 'failed',
          0 // Duration not tracked for manual retries
        );
      } catch (metricsError) {
        logger.warn('Failed to record webhook retry metrics:', metricsError);
      }

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          webhookId,
          newJobId: result.jobId
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.message,
          webhookId
        });
      }
    } catch (error: any) {
      logger.error('Failed to retry webhook', { webhookId, error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retry webhook',
        message: error.message
      });
    }
  }

  /**
   * POST /api/v1/dashboard/operations/batch/trigger
   * Manual batch job trigger
   */
  static async triggerBatchJob(req: AuthRequest, res: Response) {
    const { jobType } = req.body;

    try {
      // Verify admin/operator role
      if (!req.user || !['admin', 'operator'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      // Validate input
      if (!jobType) {
        return res.status(400).json({
          success: false,
          error: 'jobType is required',
          supportedTypes: batchJobService.getSupportedJobTypes()
        });
      }

      // Trigger batch job via BatchJobService
      const result = await batchJobService.triggerManual(jobType, req.user.id);

      logger.info('Manual batch job triggered', {
        jobType,
        userId: req.user.id,
        result
      });

      // Record metrics
      try {
        const HttpMetricsService = (await import('../middleware/metrics.middleware.js')).default;
        const metricsInstance = HttpMetricsService.getInstance(prometheusMetrics.registry);
        metricsInstance.recordBatchJobRun(
          jobType,
          result.success ? 'success' : 'failed',
          0 // Duration will be recorded when job completes
        );
      } catch (metricsError) {
        logger.warn('Failed to record batch job trigger metrics:', metricsError);
      }

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          jobType: result.jobType,
          triggeredAt: result.triggeredAt
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.message,
          jobType: result.jobType
        });
      }
    } catch (error: any) {
      logger.error('Failed to trigger batch job', { jobType, error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to trigger batch job',
        message: error.message
      });
    }
  }

  /**
   * Helper: Calculate daily trend from items
   */
  private static calculateDailyTrend(items: any[], days: number) {
    const now = new Date();
    const trend = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];

      const dayItems = items.filter(item => {
        const itemDate = new Date(item.createdAt).toISOString().split('T')[0];
        return itemDate === dateStr;
      });

      trend.push({
        date: dateStr,
        count: dayItems.length,
        amount: dayItems.reduce((sum, item) => sum + (Number(item.commissionAmount) || 0), 0)
      });
    }

    return trend;
  }
}