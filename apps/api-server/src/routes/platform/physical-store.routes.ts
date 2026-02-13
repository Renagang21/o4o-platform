/**
 * Physical Store Linking Routes
 *
 * WO-O4O-CROSS-SERVICE-STORE-LINKING-V1
 *
 * Platform admin endpoints for cross-service store linking by business_number.
 *
 * POST /sync                — Trigger full sync of physical stores
 * GET  /                    — Paginated list of physical stores with KPI
 * GET  /:id/summary         — Detail summary for a single physical store
 * GET  /:id/insights        — AI hybrid insights for a physical store
 */

import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import { requireAuth, requireAdmin } from '../../common/middleware/auth.middleware.js';
import { PhysicalStoreService } from './physical-store.service.js';
import { generatePhysicalStoreInsights } from './physical-store-insights.service.js';

export function createPhysicalStoreRoutes(dataSource: DataSource): Router {
  const router = Router();
  const service = new PhysicalStoreService(dataSource);

  router.use(requireAuth as any);
  router.use(requireAdmin as any);

  // POST /api/v1/admin/physical-stores/sync
  router.post('/sync', async (req: any, res: Response, next: NextFunction) => {
    try {
      const result = await service.syncLinks();
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('[PhysicalStore] sync error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync physical stores',
        code: 'PHYSICAL_STORE_SYNC_ERROR',
      });
    }
  });

  // GET /api/v1/admin/physical-stores
  router.get('/', async (req: any, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
      const result = await service.listPhysicalStores(page, limit);
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('[PhysicalStore] list error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch physical stores',
        code: 'PHYSICAL_STORE_LIST_ERROR',
      });
    }
  });

  // GET /api/v1/admin/physical-stores/:id/summary
  router.get('/:id/summary', async (req: any, res: Response, next: NextFunction) => {
    try {
      const summary = await service.getPhysicalStoreSummary(req.params.id);
      if (!summary) {
        return res.status(404).json({
          success: false,
          error: 'Physical store not found',
          code: 'PHYSICAL_STORE_NOT_FOUND',
        });
      }
      res.json({ success: true, data: summary });
    } catch (error: any) {
      console.error('[PhysicalStore] summary error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch physical store summary',
        code: 'PHYSICAL_STORE_SUMMARY_ERROR',
      });
    }
  });

  // GET /api/v1/admin/physical-stores/:id/insights
  router.get('/:id/insights', async (req: any, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;

      // Check store exists
      const summary = await service.getPhysicalStoreSummary(id);
      if (!summary) {
        return res.status(404).json({
          success: false,
          error: 'Physical store not found',
          code: 'PHYSICAL_STORE_NOT_FOUND',
        });
      }

      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const [currentStats, lastMonthStats] = await Promise.all([
        service.getStoreServiceStats(id, thisMonthStart.toISOString(), nextMonthStart.toISOString()),
        service.getStoreServiceStats(id, lastMonthStart.toISOString(), thisMonthStart.toISOString()),
      ]);

      const insights = generatePhysicalStoreInsights({
        current: currentStats,
        lastMonth: lastMonthStats,
      });

      res.json({ success: true, data: insights });
    } catch (error: any) {
      console.error('[PhysicalStore] insights error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate store insights',
        code: 'PHYSICAL_STORE_INSIGHTS_ERROR',
      });
    }
  });

  return router;
}
