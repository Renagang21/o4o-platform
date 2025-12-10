/**
 * Reporting-Yaksa Backend Exports
 *
 * Standardized backend exports for Module Loader integration
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { createReportingRoutes } from './routes/index.js';

// Export entities
export * from './entities/index.js';

// Export services
export * from './services/index.js';

// Export controllers
export * from './controllers/index.js';

// Export route factories
export {
  createReportingRoutes,
  createTemplateRoutes,
  createReportRoutes,
} from './routes/index.js';

// Export route definitions (for documentation/metadata)
export {
  templateRoutes,
  memberReportRoutes,
  adminReportRoutes,
  reportRoutes,
  allRoutes,
} from './routes/index.js';

/**
 * Routes factory compatible with Module Loader
 *
 * Returns a configured router for reporting-yaksa endpoints
 *
 * @param dataSource - TypeORM DataSource from API server
 */
export function routes(dataSource?: DataSource | any): Router {
  if (!dataSource) {
    throw new Error('DataSource is required for reporting-yaksa routes');
  }
  return createReportingRoutes(dataSource);
}

// Alias for manifest compatibility
export const createRoutes = routes;

/**
 * Entity list for TypeORM
 */
import * as Entities from './entities/index.js';
export const entities = Object.values(Entities).filter(
  (e) => typeof e === 'function'
);

/**
 * Services registry
 */
import * as Services from './services/index.js';
export const services = {
  AnnualReportService: Services.AnnualReportService,
  ReportTemplateService: Services.ReportTemplateService,
  MembershipSyncService: Services.MembershipSyncService,
};
