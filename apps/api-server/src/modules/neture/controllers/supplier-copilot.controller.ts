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
import { createRequireActiveSupplier } from '../middleware/neture-identity.middleware.js';
import { readOrganizationContext, resolveSupplierForUser } from '../middleware/supplier-context.resolver.js';
import { explainSupplierOverview } from '../services/supplier-overview-ai.service.js';
import { AiExtensionError } from '@o4o/ai-core';

export function createSupplierCopilotRouter(dataSource: DataSource): Router {
  const router = Router();
  const requireSupplier = createRequireSupplier(dataSource);
  const service = new SupplierCopilotService(dataSource);
  router.post('/copilot/ai-overview', requireAuth, createRequireActiveSupplier(dataSource), async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    if (!req.body || Array.isArray(req.body) || typeof req.body !== 'object' || Object.keys(req.body).length) {
      res.status(400).json({ success: false, code: 'INVALID_INPUT' }); return;
    }
    const actorId = req.user!.id, supplierId = (req as Request & { supplierId: string }).supplierId;
    const authorize = async () => {
      const current = await resolveSupplierForUser(dataSource, actorId, readOrganizationContext(req));
      return current.kind === 'resolved' && current.supplierId === supplierId && current.status === 'ACTIVE';
    };
    try {
      const data = await explainSupplierOverview(dataSource, { actorId, supplierId, authorize });
      res.json({ success: true, data: { ...data, supplierId } });
    } catch (error) {
      const code = error instanceof AiExtensionError ? error.code : 'AI_UNAVAILABLE';
      res.status(code === 'ACCESS_DENIED' ? 403 : code === 'QUOTA_EXCEEDED' ? 429 : 503).json({ success: false, code });
    }
  });

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
