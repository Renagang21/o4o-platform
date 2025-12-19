/**
 * Member-Yaksa Backend Entry Point
 *
 * Phase 1: Core Services and Routes
 * Phase 2: Home Read Model
 */

// Routes
export { createMemberYaksaRoutes, createRoutes } from './routes/index.js';

// Services (Phase 1)
export {
  LicenseQueryService,
  PharmacyInfoService,
  MemberProfileService,
} from './services/index.js';

// Home Query Service (Phase 2)
export {
  MemberHomeQueryService,
  UX_PRIORITY,
} from './home/index.js';

// Types (Phase 1)
export type {
  PharmacyInfoData,
  PharmacyUpdateRequest,
  PharmacyUpdateResponse,
  MemberProfileData,
} from './services/index.js';

// Types (Phase 2)
export type {
  HomeQueryOptions,
  MemberHomeDTO,
  OrganizationNoticeSummary,
  GroupbuySummary,
  EducationSummary,
  ForumSummary,
  BannerSummary,
  UXPriorityKey,
} from './home/index.js';
