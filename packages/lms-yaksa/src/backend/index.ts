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

// Export services
export * from './services/index.js';
export { lmsYaksaServices } from './services/index.js';

// Export controllers
export * from './controllers/index.js';

// Export routes
export * from './routes/index.js';

// Import services for routes
import { LicenseProfileService } from './services/LicenseProfileService.js';
import { RequiredCoursePolicyService } from './services/RequiredCoursePolicyService.js';
import { CreditRecordService } from './services/CreditRecordService.js';
import { CourseAssignmentService } from './services/CourseAssignmentService.js';

// Import route factory
import { createYaksaLmsRoutes } from './routes/yaksaLms.routes.js';

/**
 * Routes factory compatible with Module Loader
 *
 * Base path for API: /api/v1/lms/yaksa/*
 *
 * @param dataSource - TypeORM DataSource from API server
 */
export function routes(dataSource?: DataSource | any): Router {
  const router = Router();

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', app: 'lms-yaksa', version: '1.0.0' });
  });

  // Mount Yaksa LMS routes if dataSource is provided
  if (dataSource) {
    router.use('/', createYaksaLmsRoutes(dataSource));
  }

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
 * Services registry
 * Returns initialized service instances with DataSource
 */
export const services = {
  LicenseProfileService,
  RequiredCoursePolicyService,
  CreditRecordService,
  CourseAssignmentService,
};

/**
 * Create service instances factory
 * @param dataSource - TypeORM DataSource from API server
 */
export function createServices(dataSource: DataSource) {
  return {
    licenseProfileService: new LicenseProfileService(dataSource),
    requiredCoursePolicyService: new RequiredCoursePolicyService(dataSource),
    creditRecordService: new CreditRecordService(dataSource),
    courseAssignmentService: new CourseAssignmentService(dataSource),
  };
}
