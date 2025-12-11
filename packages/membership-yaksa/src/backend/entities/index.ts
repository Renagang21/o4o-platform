/**
 * Entity exports with controlled loading order
 *
 * This file ensures entities are loaded in dependency order to prevent
 * circular dependency initialization errors in ES modules.
 *
 * Loading order:
 * 1. MemberCategory (no dependencies)
 * 2. Member (depends on MemberCategory)
 * 3. Affiliation, MembershipRoleAssignment, MembershipYear, Verification (depend on Member)
 */

// Load independent entities first
export { MemberCategory } from './MemberCategory.js';

// Then load Member which depends on MemberCategory
export { Member } from './Member.js';
export type { PharmacistType, WorkplaceType, OfficialRole, Gender } from './Member.js';

// Finally load entities that depend on Member
export { Affiliation } from './Affiliation.js';
export { MembershipRoleAssignment } from './MembershipRoleAssignment.js';
export { MembershipYear } from './MembershipYear.js';
export { Verification } from './Verification.js';
