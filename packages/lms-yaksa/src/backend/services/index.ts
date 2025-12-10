/**
 * LMS-Yaksa Services Exports
 *
 * Provides all service classes for the LMS-Yaksa extension app.
 */

export { LicenseProfileService } from './LicenseProfileService.js';
export { RequiredCoursePolicyService } from './RequiredCoursePolicyService.js';
export { CreditRecordService } from './CreditRecordService.js';
export { CourseAssignmentService } from './CourseAssignmentService.js';

/**
 * Service classes list for module registration
 */
export const lmsYaksaServices = {
  LicenseProfileService: 'LicenseProfileService',
  RequiredCoursePolicyService: 'RequiredCoursePolicyService',
  CreditRecordService: 'CreditRecordService',
  CourseAssignmentService: 'CourseAssignmentService',
} as const;

export type LmsYaksaServiceName = keyof typeof lmsYaksaServices;
