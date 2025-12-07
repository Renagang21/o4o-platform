/**
 * Membership-Yaksa Stats Routes
 *
 * /api/membership/stats
 */

import { Router } from 'express';
import { DataSource } from 'typeorm';
import { StatsController } from '../controllers/StatsController.js';
import { StatsService } from '../services/StatsService.js';

export function createStatsRoutes(dataSource: DataSource): Router {
  const router = Router();
  const statsService = new StatsService(dataSource);
  const statsController = new StatsController(statsService);

  /**
   * GET /api/membership/stats
   */
  router.get('/', (req, res) => statsController.getDashboardStats(req, res));

  return router;
}
