/**
 * Store Network Dashboard Routes
 *
 * WO-O4O-STORE-NETWORK-DASHBOARD-V1
 * WO-O4O-STORE-NETWORK-AI-HYBRID-V1 (insights endpoint)
 *
 * Platform admin endpoints for cross-service store KPI aggregation.
 *
 * GET /summary    — Network-level KPI + per-service breakdown
 * GET /top-stores — Top stores by monthly revenue across all services
 * GET /insights   — AI hybrid insights (growth, concentration, comparison)
 */

import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import { requireAuth, requireAdmin } from '../../common/middleware/auth.middleware.js';
import { StoreNetworkService } from './store-network.service.js';
import { generateNetworkInsights } from './store-network-insights.service.js';

export function createStoreNetworkRoutes(dataSource: DataSource): Router {
  const router = Router();
  const service = new StoreNetworkService(dataSource);

  router.use(requireAuth as any);
  router.use(requireAdmin as any);

  // GET /api/v1/admin/store-network/summary
  router.get('/summary', async (req: any, res: Response, next: NextFunction) => {
    try {
      const summary = await service.getNetworkSummary();
      res.json({ success: true, data: summary });
    } catch (error: any) {
      console.error('[StoreNetwork] summary error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch network summary',
        code: 'STORE_NETWORK_ERROR',
      });
    }
  });

  // GET /api/v1/admin/store-network/top-stores?limit=10
  router.get('/top-stores', async (req: any, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 50);
      const topStores = await service.getTopStores(limit);
      res.json({ success: true, data: topStores });
    } catch (error: any) {
      console.error('[StoreNetwork] top-stores error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch top stores',
        code: 'STORE_NETWORK_ERROR',
      });
    }
  });

  // GET /api/v1/admin/store-network/insights
  router.get('/insights', async (req: any, res: Response, next: NextFunction) => {
    try {
      const [current, lastMonth, topStores] = await Promise.all([
        service.getNetworkSummary(),
        service.getLastMonthStats(),
        service.getTopStores(10),
      ]);

      const insights = generateNetworkInsights({ current, lastMonth, topStores });
      res.json({ success: true, data: insights });
    } catch (error: any) {
      console.error('[StoreNetwork] insights error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate network insights',
        code: 'STORE_NETWORK_ERROR',
      });
    }
  });

  return router;
}
