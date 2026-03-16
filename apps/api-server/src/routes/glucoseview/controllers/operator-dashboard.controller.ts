/**
 * GlucoseView Operator Dashboard Controller
 *
 * WO-O4O-OPERATOR-CODE-CLEANUP-AND-REFRACTOR-V1:
 *   Controller → thin req/res only. Logic in operator-dashboard.service.ts
 *
 * Routes:
 *   GET /operator/dashboard — 5-block OperatorDashboardConfig
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { requireGlucoseViewScope } from '../../../middleware/glucoseview-scope.middleware.js';
import { CopilotEngineService } from '../../../copilot/copilot-engine.service.js';
import { buildGlucoseViewDashboardConfig } from '../services/operator-dashboard.service.js';
import type { ActionLogService } from '@o4o/action-log-core';

export function createOperatorDashboardController(
  dataSource: DataSource,
  actionLogService?: ActionLogService
): Router {
  const router = Router();
  const copilotEngine = new CopilotEngineService();

  router.use(requireAuth);
  router.use(requireGlucoseViewScope('glucoseview:operator') as any);

  /**
   * GET /operator/dashboard
   * GlucoseView operator dashboard — 5-block response
   */
  router.get('/dashboard', async (_req: Request, res: Response): Promise<void> => {
    try {
      const userId = (_req as any).user?.id || '';
      const config = await buildGlucoseViewDashboardConfig(dataSource, copilotEngine, userId);
      res.json({ success: true, data: config });
    } catch (error: any) {
      console.error('[GlucoseView Operator Dashboard] Error:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  return router;
}
