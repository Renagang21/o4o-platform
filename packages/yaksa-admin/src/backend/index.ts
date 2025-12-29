/**
 * yaksa-admin Backend Entry Point
 *
 * Phase 1: Read-Only APIs for Organization/Member/Officer management
 */

// Routes
export { createRoutes } from './routes/index.js';

// Services
export {
  OrganizationReadService,
  organizationReadService,
  MemberReadService,
  memberReadService,
  OfficerReadService,
  officerReadService,
  YAKSA_OFFICER_ROLES,
} from './services/index.js';

// Controllers
export {
  OrganizationController,
  organizationController,
  MemberController,
  memberController,
  OfficerController,
  officerController,
} from './controllers/index.js';

// Types
export type {
  OrganizationDto,
  ListOrganizationsOptions,
  ListOrganizationsResult,
} from './services/OrganizationReadService.js';

export type {
  OrganizationMemberDto,
  ListMembersOptions,
  ListMembersResult,
} from './services/MemberReadService.js';

export type {
  OfficerAssignmentDto,
  ListOfficersOptions,
  ListOfficersResult,
} from './services/OfficerReadService.js';
