/**
 * Glycopharm Operator Dashboard Controller
 *
 * WO-O4O-OPERATOR-CODE-CLEANUP-AND-REFRACTOR-V1:
 *   Controller → thin req/res only. Logic in operator-dashboard.service.ts
 *
 * Routes:
 *   GET /operator/dashboard          — 5-block OperatorDashboardConfig
 *   GET /operator/recent-orders      — Legacy stub (E-commerce Core 미통합)
 *   GET /operator/pending-applications — Pending applications list
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { GlycopharmApplication } from '../entities/glycopharm-application.entity.js';
import { requireGlycopharmScope } from '../../../middleware/glycopharm-scope.middleware.js';
import { CopilotEngineService } from '../../../copilot/copilot-engine.service.js';
import { buildGlycoPharmDashboardConfig } from '../services/operator-dashboard.service.js';
import type { ActionLogService } from '@o4o/action-log-core';

type AuthMiddleware = RequestHandler;

export function createOperatorController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  actionLogService?: ActionLogService
): Router {
  const router = Router();
  const copilotEngine = new CopilotEngineService();

  router.use(requireAuth);
  router.use(requireGlycopharmScope('glycopharm:operator') as any);

  /**
   * GET /operator/dashboard
   * Glycopharm operator dashboard — 5-block response
   */
  router.get('/dashboard', async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id || '';
      const config = await buildGlycoPharmDashboardConfig(dataSource, copilotEngine, userId);
      res.json({ success: true, data: config });
    } catch (error: any) {
      console.error('Failed to get operator dashboard:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * GET /operator/recent-orders
   * Legacy stub — returns empty until E-commerce Core integration
   */
  router.get('/recent-orders', async (req: Request, res: Response): Promise<void> => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      res.json({
        success: true,
        data: {
          orders: [],
          stats: { todayOrders: 0, todayRevenue: 0, pendingOrders: 0, processingOrders: 0, shippedOrders: 0, avgOrderValue: 0 },
          pagination: { page, limit, total: 0, totalPages: 0 },
        },
        _notice: 'Order system migration in progress. Orders will be available via E-commerce Core.',
      });
    } catch (error: any) {
      console.error('Failed to get recent orders:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * GET /operator/pending-applications
   * Get pending applications for operator review
   */
  router.get('/pending-applications', async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const applicationRepo = dataSource.getRepository(GlycopharmApplication);

      const pendingApplications = await applicationRepo.find({
        where: { status: 'submitted' },
        order: { submittedAt: 'DESC' },
        take: limit,
      });

      res.json({
        success: true,
        data: pendingApplications.map((app) => ({
          id: app.id,
          organizationName: app.organizationName,
          organizationType: app.organizationType,
          status: app.status,
          serviceTypes: app.serviceTypes,
          submittedAt: app.submittedAt,
        })),
      });
    } catch (error: any) {
      console.error('Failed to get pending applications:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  return router;
}
