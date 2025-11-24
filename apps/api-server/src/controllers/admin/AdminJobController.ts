/**
 * Admin Job Controller (Phase PD-8)
 * Manual triggers for automated jobs
 */

import { Request, Response } from 'express';
import { triggerPriceSync, isPriceSyncRunning, getLastRunStats as getPriceSyncStats } from '../../jobs/price-sync.job.js';
import { triggerStockSync, isStockSyncRunning, getLastRunStats as getStockSyncStats } from '../../jobs/stock-sync.job.js';
import { SettlementBatchService } from '../../services/SettlementBatchService.js';
import logger from '../../utils/logger.js';

export class AdminJobController {
  private settlementBatchService: SettlementBatchService;

  constructor() {
    this.settlementBatchService = new SettlementBatchService();
  }

  /**
   * POST /api/v2/admin/jobs/run-daily
   * Run daily jobs: price sync + stock sync
   */
  async runDailyJobs(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      // Admin only
      if (userRole !== 'admin' && userRole !== 'super_admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
        return;
      }

      logger.info('[PD-8] Daily jobs triggered manually', { userId, userRole });

      // Check if jobs are already running
      if (isPriceSyncRunning() || isStockSyncRunning()) {
        res.status(409).json({
          success: false,
          error: 'Jobs are already running. Please wait for completion.'
        });
        return;
      }

      // Run jobs in parallel (non-blocking)
      const jobPromises = [
        triggerPriceSync().catch(err => {
          logger.error('[PD-8] Price sync failed:', err);
          return { error: err.message };
        }),
        triggerStockSync().catch(err => {
          logger.error('[PD-8] Stock sync failed:', err);
          return { error: err.message };
        })
      ];

      // Wait for both jobs to complete
      const [priceResult, stockResult] = await Promise.all(jobPromises);

      res.json({
        success: true,
        message: 'Daily jobs completed',
        results: {
          priceSync: priceResult,
          stockSync: stockResult
        },
        triggeredAt: new Date().toISOString(),
        triggeredBy: userId
      });

    } catch (error) {
      logger.error('[PD-8] Daily jobs failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to run daily jobs',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/v2/admin/jobs/run-monthly
   * [DEPRECATED] This endpoint is deprecated. Use the new daily settlement batch system.
   * Run monthly jobs: settlement generation
   */
  async runMonthlyJobs(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      // Admin only
      if (userRole !== 'admin' && userRole !== 'super_admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
        return;
      }

      logger.warn('[PD-8] DEPRECATED: runMonthlyJobs called', { userId, userRole });

      res.status(410).json({
        success: false,
        message: 'This endpoint is deprecated. Settlements are now created automatically by SettlementEngine (R-8-8).',
        deprecationNotice: {
          reason: 'Replaced by automatic settlement generation (SettlementEngine)',
          replacement: 'SettlementEngine automatically creates settlements when orders complete. Use the CLI script for batch processing: npm run batch:settlement:daily',
          migrationGuide: 'See R-8-8 documentation for the new settlement system'
        }
      });

    } catch (error) {
      logger.error('[PD-8] Monthly jobs failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to run monthly jobs',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/v2/admin/jobs/status
   * Get job status and last run statistics
   */
  async getJobStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      // Admin only
      if (userRole !== 'admin' && userRole !== 'super_admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
        return;
      }

      const priceSyncStats = getPriceSyncStats();
      const stockSyncStats = getStockSyncStats();

      res.json({
        success: true,
        jobs: {
          priceSync: {
            isRunning: isPriceSyncRunning(),
            lastRunTime: priceSyncStats.lastRunTime,
            lastRunStats: priceSyncStats.stats
          },
          stockSync: {
            isRunning: isStockSyncRunning(),
            lastRunTime: stockSyncStats.lastRunTime,
            lastRunStats: stockSyncStats.stats
          }
        },
        queriedAt: new Date().toISOString()
      });

    } catch (error) {
      logger.error('[PD-8] Failed to get job status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get job status',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
