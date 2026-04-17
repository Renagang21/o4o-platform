/**
 * Cosmetics Tourist Hub Controller
 *
 * WO-KCOS-TOURIST-HUB-STATS-BACKEND-IMPL-V1
 *
 * Provides minimal stats for the Tourist Hub feature.
 * Public endpoint — no auth required (optionalAuth pattern: user context not needed for aggregates).
 *
 * Scope: GET /tourist-hub/stats only.
 * /tourist-hub/stores is deferred to a future WO.
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';

export function createCosmeticsTouristHubController(dataSource: DataSource): Router {
  const router = Router();

  /**
   * GET /tourist-hub/stats
   *
   * Returns aggregate stats for the Tourist Hub card and page.
   * - activeStores: count of cosmetics stores with status = 'approved'
   *
   * Auth: public (no token required)
   * Fallback: activeStores = 0 if none exist (not an error)
   */
  router.get(
    '/stats',
    asyncHandler(async (_req: Request, res: Response): Promise<void> => {
      const result = await dataSource.query(
        `SELECT COUNT(*)::int AS "activeStores"
         FROM cosmetics.cosmetics_stores
         WHERE status = 'approved'`,
      );
      const activeStores: number = result[0]?.activeStores ?? 0;
      res.json({ success: true, data: { activeStores } });
    }),
  );

  return router;
}
