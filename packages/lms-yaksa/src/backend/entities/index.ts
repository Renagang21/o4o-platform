/**
 * LMS-Yaksa Entities Export
 *
 * Phase 1: Entity definitions for Yaksa LMS extension
 */

export { YaksaLicenseProfile } from './YaksaLicenseProfile.entity.js';
export { RequiredCoursePolicy } from './RequiredCoursePolicy.entity.js';
export { CreditRecord, CreditType } from './CreditRecord.entity.js';
export { YaksaCourseAssignment, AssignmentStatus } from './YaksaCourseAssignment.entity.js';

// Entity array for TypeORM registration
import { YaksaLicenseProfile } from './YaksaLicenseProfile.entity.js';
import { RequiredCoursePolicy } from './RequiredCoursePolicy.entity.js';
import { CreditRecord } from './CreditRecord.entity.js';
import { YaksaCourseAssignment } from './YaksaCourseAssignment.entity.js';

export const lmsYaksaEntities = [
  YaksaLicenseProfile,
  RequiredCoursePolicy,
  CreditRecord,
  YaksaCourseAssignment,
];
