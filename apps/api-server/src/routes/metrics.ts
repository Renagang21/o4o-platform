/**
 * Prometheus Metrics Routes
 * Sprint 4: Expose metrics in Prometheus format
 *
 * Endpoint:
 * GET /metrics - Prometheus metrics endpoint (text format)
 *
 * Note: This endpoint should be protected in production
 * or exposed only to internal monitoring systems
 */

import { Router, Request, Response } from 'express';
import { prometheusMetrics } from '../services/prometheus-metrics.service';
import logger from '../utils/logger';

const router: Router = Router();

/**
 * GET /metrics
 * Prometheus scrape endpoint
 *
 * Returns metrics in Prometheus text format:
 * # HELP metric_name Description
 * # TYPE metric_name gauge|counter|histogram
 * metric_name{label="value"} 123
 */
router.get('/',
  async (req: Request, res: Response) => {
    try {
      // Get metrics in Prometheus format
      const metrics = await prometheusMetrics.getMetrics();

      // Set content type for Prometheus
      res.set('Content-Type', prometheusMetrics.getContentType());

      res.send(metrics);

    } catch (error: any) {
      logger.error('Failed to generate Prometheus metrics', {
        error: error.message,
        stack: error.stack,
      });

      res.status(500).send('# Error generating metrics\n');
    }
  }
);

export default router;
