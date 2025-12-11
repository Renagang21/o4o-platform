import { Router } from 'express';
import type { DataSource } from 'typeorm';

import { LicenseProfileService } from '../services/LicenseProfileService.js';
import { RequiredCoursePolicyService } from '../services/RequiredCoursePolicyService.js';
import { CreditRecordService } from '../services/CreditRecordService.js';
import { CourseAssignmentService } from '../services/CourseAssignmentService.js';

import { createLicenseProfileRoutes } from '../controllers/LicenseProfileController.js';
import { createRequiredCoursePolicyRoutes } from '../controllers/RequiredCoursePolicyController.js';
import { createCreditRecordRoutes } from '../controllers/CreditRecordController.js';
import { createCourseAssignmentRoutes } from '../controllers/CourseAssignmentController.js';
import { createYaksaLmsAdminRoutes } from '../controllers/YaksaLmsAdminController.js';

/**
 * Service instances container
 */
interface YaksaLmsServices {
  licenseProfileService: LicenseProfileService;
  requiredCoursePolicyService: RequiredCoursePolicyService;
  creditRecordService: CreditRecordService;
  courseAssignmentService: CourseAssignmentService;
}

/**
 * Create all Yaksa LMS routes
 *
 * Base path: /api/v1/lms-yaksa
 *
 * @param dataSource - TypeORM DataSource for service initialization
 * @returns Express Router with all Yaksa LMS routes
 */
export function createYaksaLmsRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Initialize services
  const services: YaksaLmsServices = {
    licenseProfileService: new LicenseProfileService(dataSource),
    requiredCoursePolicyService: new RequiredCoursePolicyService(dataSource),
    creditRecordService: new CreditRecordService(dataSource),
    courseAssignmentService: new CourseAssignmentService(dataSource),
  };

  // Mount sub-routes
  router.use(
    '/license-profiles',
    createLicenseProfileRoutes(services.licenseProfileService)
  );

  router.use(
    '/policies/required-courses',
    createRequiredCoursePolicyRoutes(services.requiredCoursePolicyService)
  );

  router.use(
    '/credits',
    createCreditRecordRoutes(services.creditRecordService)
  );

  router.use(
    '/course-assignments',
    createCourseAssignmentRoutes(services.courseAssignmentService)
  );

  router.use(
    '/admin',
    createYaksaLmsAdminRoutes(services)
  );

  return router;
}

/**
 * Create Yaksa LMS routes with pre-initialized services
 *
 * Use this when services are already initialized externally.
 *
 * @param services - Pre-initialized service instances
 * @returns Express Router with all Yaksa LMS routes
 */
export function createYaksaLmsRoutesWithServices(services: YaksaLmsServices): Router {
  const router = Router();

  router.use(
    '/license-profiles',
    createLicenseProfileRoutes(services.licenseProfileService)
  );

  router.use(
    '/policies/required-courses',
    createRequiredCoursePolicyRoutes(services.requiredCoursePolicyService)
  );

  router.use(
    '/credits',
    createCreditRecordRoutes(services.creditRecordService)
  );

  router.use(
    '/course-assignments',
    createCourseAssignmentRoutes(services.courseAssignmentService)
  );

  router.use(
    '/admin',
    createYaksaLmsAdminRoutes(services)
  );

  return router;
}

export default createYaksaLmsRoutes;
