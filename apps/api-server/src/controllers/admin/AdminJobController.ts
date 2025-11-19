/**
 * Admin Job Controller (Phase PD-8)
 * Manual triggers for automated jobs
 */

import { Request, Response } from 'express';
import { triggerPriceSync, isPriceSyncRunning, getLastRunStats as getPriceSyncStats } from '../../jobs/price-sync.job.js';
import { triggerStockSync, isStockSyncRunning, getLastRunStats as getStockSyncStats } from '../../jobs/stock-sync.job.js';
import { SettlementManagementService } from '../../services/SettlementManagementService.js';
import logger from '../../utils/logger.js';

export class AdminJobController {
  private settlementService: SettlementManagementService;

  constructor() {
    this.settlementService = new SettlementManagementService();
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

      logger.info('[PD-8] Monthly jobs triggered manually', { userId, userRole });

      // Get date range from request, or use last month as default
      const { periodStart, periodEnd } = req.body;

      let startDate: Date;
      let endDate: Date;

      if (periodStart && periodEnd) {
        startDate = new Date(periodStart);
        endDate = new Date(periodEnd);
      } else {
        // Default to last month
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1); // First day of last month
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999); // Last day of last month
      }

      logger.info('[PD-8] Creating settlements for period', {
        periodStart: startDate.toISOString(),
        periodEnd: endDate.toISOString()
      });

      // Run settlement batch creation
      const result = await this.settlementService.batchCreateSettlements(
        startDate,
        endDate
      );

      res.json({
        success: true,
        message: 'Monthly settlement creation completed',
        result: {
          created: result.created.length,
          failed: result.errors.length,
          settlements: result.created.map(s => ({
            id: s.id,
            partyType: s.partyType,
            partyId: s.partyId,
            payableAmount: s.payableAmount,
            status: s.status
          })),
          errors: result.errors
        },
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        triggeredAt: new Date().toISOString(),
        triggeredBy: userId
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
