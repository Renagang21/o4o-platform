/**
 * Cosmetics Sample & Display Extension Routes
 *
 * 샘플 & 진열 관리 API 라우트
 * Prefix: /api/v1/cosmetics-sample
 */

import { Router } from 'express';
import { DataSource } from 'typeorm';
import { createSampleInventoryController } from '../controllers/sample-inventory.controller';
import { createUsageController } from '../controllers/usage.controller';
import { createDisplayController } from '../controllers/display.controller';
import { createAnalyticsController } from '../controllers/analytics.controller';

export function createSampleDisplayRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Mount controllers
  router.use('/inventory', createSampleInventoryController(dataSource));
  router.use('/usage', createUsageController(dataSource));
  router.use('/display', createDisplayController(dataSource));
  router.use('/analytics', createAnalyticsController(dataSource));

  return router;
}

export { createSampleDisplayRoutes as createRoutes };
