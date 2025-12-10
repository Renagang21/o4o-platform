/**
 * LMS-Yaksa Backend Exports
 *
 * Standardized backend exports for Module Loader integration
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';

// Export entities
export * from './entities/index.js';
export { lmsYaksaEntities } from './entities/index.js';

// Export services (placeholder for Phase 2)
// export * from './services/index.js';

/**
 * Routes factory compatible with Module Loader
 *
 * @param dataSource - TypeORM DataSource from API server
 */
export function routes(dataSource?: DataSource | any): Router {
  const router = Router();

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', app: 'lms-yaksa', version: '1.0.0' });
  });

  // TODO Phase 2: Add API routes for each entity
  // - /license-profiles
  // - /required-policies
  // - /credit-records
  // - /course-assignments

  return router;
}

// Alias for manifest compatibility
export const createRoutes = routes;

/**
 * Entity list for TypeORM registration
 */
import {
  YaksaLicenseProfile,
  RequiredCoursePolicy,
  CreditRecord,
  YaksaCourseAssignment,
} from './entities/index.js';

export const entities = [
  YaksaLicenseProfile,
  RequiredCoursePolicy,
  CreditRecord,
  YaksaCourseAssignment,
];

/**
 * Services registry (placeholder for Phase 2)
 */
export const services = {
  // LicenseProfileService: null,
  // RequiredCoursePolicyService: null,
  // CreditRecordService: null,
  // CourseAssignmentService: null,
};
