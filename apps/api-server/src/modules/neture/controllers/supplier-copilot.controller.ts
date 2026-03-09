/**
 * SupplierCopilotController
 *
 * WO-O4O-SUPPLIER-COPILOT-DASHBOARD-V1
 *
 * GET /copilot/kpi
 * GET /copilot/products/performance
 * GET /copilot/distribution
 * GET /copilot/products/trending
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { createRequireSupplier } from '../../../utils/supplier.utils.js';
import { SupplierCopilotService } from '../services/supplier-copilot.service.js';

export function createSupplierCopilotRouter(dataSource: DataSource): Router {
  const router = Router();
  const requireSupplier = createRequireSupplier(dataSource);
  const service = new SupplierCopilotService(dataSource);

  // GET /copilot/kpi
  router.get('/copilot/kpi', requireAuth, requireSupplier, async (req: Request, res: Response) => {
    try {
      const supplierId = (req as any).supplierId as string;
      const data = await service.getKpiSummary(supplierId);
      res.json({ success: true, data });
    } catch (error) {
      console.error('[SupplierCopilot] KPI error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // GET /copilot/products/performance
  router.get('/copilot/products/performance', requireAuth, requireSupplier, async (req: Request, res: Response) => {
    try {
      const supplierId = (req as any).supplierId as string;
      const limit = Math.min(Number(req.query.limit) || 10, 50);
      const data = await service.getProductPerformance(supplierId, limit);
      res.json({ success: true, data });
    } catch (error) {
      console.error('[SupplierCopilot] Performance error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // GET /copilot/distribution
  router.get('/copilot/distribution', requireAuth, requireSupplier, async (req: Request, res: Response) => {
    try {
      const supplierId = (req as any).supplierId as string;
      const data = await service.getDistribution(supplierId);
      res.json({ success: true, data });
    } catch (error) {
      console.error('[SupplierCopilot] Distribution error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // GET /copilot/products/trending
  router.get('/copilot/products/trending', requireAuth, requireSupplier, async (req: Request, res: Response) => {
    try {
      const supplierId = (req as any).supplierId as string;
      const limit = Math.min(Number(req.query.limit) || 5, 20);
      const data = await service.getTrendingProducts(supplierId, limit);
      res.json({ success: true, data });
    } catch (error) {
      console.error('[SupplierCopilot] Trending error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  return router;
}
