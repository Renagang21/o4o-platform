/**
 * diabetes-pharmacy Backend
 *
 * Express 라우터 및 서비스 통합
 *
 * @package @o4o/diabetes-pharmacy
 */

import { Router } from 'express';
import { createActionRoutes } from './controllers/ActionController.js';
import { createDashboardRoutes } from './controllers/DashboardController.js';

// Re-export services
export * from './services/index.js';

// Re-export controllers
export * from './controllers/index.js';

// Re-export DTOs
export * from './dto/index.js';

/**
 * Create Express routes for diabetes-pharmacy
 * Used by ModuleLoader
 */
export function createRoutes(): Router {
  const router = Router();

  // Dashboard routes
  createDashboardRoutes(router);

  // Action routes
  createActionRoutes(router);

  console.log('[diabetes-pharmacy] Routes registered');
  return router;
}

/**
 * Route prefix for diabetes-pharmacy API
 */
export const DIABETES_PHARMACY_ROUTE_PREFIX = 'api/v1/diabetes-pharmacy';

/**
 * API route definitions
 */
export const diabetesPharmacyRoutes = {
  dashboard: {
    base: '/dashboard',
    patients: '/dashboard/patients',
    stats: '/dashboard/stats',
  },
  actions: {
    base: '/actions',
    detail: '/actions/:id',
    execute: '/actions/:id/execute',
  },
};
