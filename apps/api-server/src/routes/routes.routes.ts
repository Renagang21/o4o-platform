/**
 * Routes API Endpoint - STUB (Phase R1)
 *
 * Phase R1: Execution Boundary Cleanup
 * DynamicRouter from cms-core has been removed.
 * These endpoints return empty/stub responses for backward compatibility.
 */

import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /admin
 * STUB - Returns empty routes list
 */
router.get('/admin', async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: [],
    total: 0,
    context: {
      phase: 'R1',
      message: 'Dynamic router disabled in Phase R1',
    },
  });
});

/**
 * GET /stats
 * STUB - Returns empty stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      total: 0,
      byApp: {},
      byLayout: {},
      authRequired: 0,
      publicRoutes: 0,
      phase: 'R1',
      message: 'Dynamic router disabled in Phase R1',
    },
  });
});

/**
 * POST /cache/clear
 * STUB - No-op
 */
router.post('/cache/clear', async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Phase R1 stub - no cache to clear',
  });
});

/**
 * GET /by-app/:appId
 * STUB - Returns empty routes for any app
 */
router.get('/by-app/:appId', async (req: Request, res: Response) => {
  const { appId } = req.params;
  res.json({
    success: true,
    data: [],
    total: 0,
    appId,
    phase: 'R1',
    message: 'Dynamic router disabled in Phase R1',
  });
});

export default router;
