/**
 * Membership-Yaksa Backend Exports
 *
 * Standardized backend exports for Module Loader integration
 */

import { Router } from 'express';
import { DataSource } from 'typeorm';
import { createMembershipRoutes } from './routes/index.js';

// Export entities
export * from './entities/index.js';

// Export services (if any)
// export * from './services/index.js';

// Export controllers
export * from './controllers/MemberController.js';
export * from './controllers/VerificationController.js';
export * from './controllers/ExportController.js';

/**
 * Routes factory compatible with Module Loader
 *
 * Returns a configured router for membership-yaksa endpoints
 *
 * @param dataSource - TypeORM DataSource from API server
 */
export function routes(dataSource?: DataSource | any): Router {
  if (!dataSource) {
    throw new Error('DataSource is required for membership-yaksa routes');
  }
  return createMembershipRoutes(dataSource);
}

/**
 * Entity list for TypeORM
 */
import * as Entities from './entities/index.js';
export const entities = Object.values(Entities);

/**
 * Services registry
 */
export const services = {};
