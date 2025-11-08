import { Router, Request, Response } from 'express';
import metricsService from '../services/metrics.service.js';

/**
 * Prometheus Metrics Routes
 * Phase 8: Policy Resolution & Commission Metrics
 *
 * Exposes metrics for monitoring and observability
 *
 * Created: 2025-01-07
 */

const router: Router = Router();

/**
 * GET /metrics
 * Prometheus metrics endpoint
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const metrics = await metricsService.getMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(metrics);
  } catch (error: any) {
    res.status(500).send('Error generating metrics');
  }
});

export default router;
