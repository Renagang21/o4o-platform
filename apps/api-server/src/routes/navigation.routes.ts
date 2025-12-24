/**
 * Navigation API Routes - STUB (Phase R1)
 *
 * Phase R1: Execution Boundary Cleanup
 * Navigation registry from cms-core has been removed.
 * These endpoints return empty/stub responses for backward compatibility.
 */

import { Router, Request, Response } from 'express';
import logger from '../utils/logger.js';

const router: Router = Router();

/**
 * GET /api/v1/navigation/admin
 * STUB - Returns empty navigation tree
 */
router.get('/admin', async (req: Request, res: Response) => {
  logger.info('[Navigation] Phase R1 stub - returning empty navigation');
  res.json({
    success: true,
    data: [],
    total: 0,
    context: {
      phase: 'R1',
      message: 'Navigation registry disabled in Phase R1',
    },
  });
});

/**
 * GET /api/v1/navigation/stats
 * STUB - Returns empty stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      totalItems: 0,
      phase: 'R1',
      message: 'Navigation registry disabled in Phase R1',
    },
  });
});

/**
 * POST /api/v1/navigation/cache/clear
 * STUB - No-op
 */
router.post('/cache/clear', async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Phase R1 stub - no cache to clear',
  });
});

export default router;
