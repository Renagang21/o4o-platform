/**
 * Reporting-Yaksa Routes
 *
 * Router factories that create routes with DataSource
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { createTemplateRoutes } from './templateRoutes.js';
import { createReportRoutes } from './reportRoutes.js';
import { createYaksaReportRoutes } from './yaksaReportRoutes.js';

// Export individual route factories
export { createTemplateRoutes } from './templateRoutes.js';
export { createReportRoutes } from './reportRoutes.js';
export { createYaksaReportRoutes } from './yaksaReportRoutes.js';

// Export route definitions (for documentation/metadata)
export { templateRoutes } from './templateRoutes.js';
export {
  memberReportRoutes,
  adminReportRoutes,
  reportRoutes,
} from './reportRoutes.js';

/**
 * Create all reporting routes
 *
 * This is the main entry point for API server integration
 *
 * @param dataSource - TypeORM DataSource from API server
 */
export function createReportingRoutes(dataSource: DataSource): Router {
  const router = Router();

  // /api/reporting/templates/*
  router.use('/templates', createTemplateRoutes(dataSource));

  // /api/reporting/* (reports and member routes)
  router.use('/', createReportRoutes(dataSource));

  // /api/v1/yaksa/reports/* (RPA 기반 신고서)
  router.use('/yaksa/reports', createYaksaReportRoutes());

  return router;
}

// All route definitions combined
import { templateRoutes } from './templateRoutes.js';
import { reportRoutes } from './reportRoutes.js';

export const allRoutes = [...templateRoutes, ...reportRoutes];
