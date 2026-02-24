/**
 * Operational Metrics Controller
 *
 * WO-O4O-INTERNAL-BETA-ROLL-OUT-V1
 *
 * Read-only internal endpoint for operational visibility.
 * Only active when BETA_MODE=true.
 *
 * GET /internal/ops/metrics — current 60s snapshot
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { opsMetrics } from '../../services/ops-metrics.service.js';
import { betaConfig } from '../../config/app.config.js';

export function createOpsMetricsController(): Router {
  const router = Router();

  /**
   * GET /internal/ops/metrics
   *
   * Returns current in-memory counter snapshot.
   * Requires authentication.
   * Only responds when BETA_MODE=true.
   */
  router.get(
    '/metrics',
    requireAuth as any,
    (_req: Request, res: Response) => {
      if (!betaConfig.isEnabled()) {
        return res.status(404).json({
          error: { code: 'BETA_MODE_OFF', message: 'Beta mode is not enabled' },
        });
      }

      const snapshot = opsMetrics.snapshot();
      const keys = Object.keys(snapshot);

      res.json({
        success: true,
        data: {
          betaMode: true,
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          metricsCount: keys.length,
          counters: snapshot,
        },
      });
    },
  );

  return router;
}
