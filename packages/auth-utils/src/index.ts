export type { ApiUser, ParsedAuthResponse, RoleMap } from './types.js';
export { parseAuthResponse } from './parseAuthResponse.js';
export { normalizeUser } from './normalizeUser.js';
export { AUTH_ERROR_MESSAGES, resolveAuthError } from './errorMessages.js';
export { ROLE_PRIORITY } from './rolePriority.js';
export { ROLE_DASHBOARD_MAP } from './roleDashboardMap.js';
export { getPrimaryDashboardRoute } from './getPrimaryDashboardRoute.js';
export { hasRole, hasAnyRole, isOperatorOrAbove, isAdminOrAbove } from './hasRole.js';
export { isStoreOwnerDual } from './isStoreOwnerDual.js';
export { extractRoles } from './extractRoles.js';
export type { ProfileConfig } from './profile-utils.js';
export { PROFILE_MAP } from './profile-utils.js';
export type { MembershipStatus, MembershipLike, UserLike } from './membershipGate.js';
export { getServiceMembershipStatus, isPlatformSuperAdmin, isServiceAccessAllowed, normalizeMemberships } from './membershipGate.js';
export type { PlatformUser } from './buildPlatformUser.js';
export { buildPlatformUser } from './buildPlatformUser.js';
export { AUTH_TOKEN_CLEARED_EVENT } from './authEvents.js';
// WO-O4O-PASSWORD-COMPLEXITY-POLICY-UNIFY-V1
export type { PasswordPolicyResult } from './passwordPolicy.js';
export {
  PASSWORD_MIN_LENGTH,
  PASSWORD_POLICY_RULES,
  PASSWORD_POLICY_HINT,
  PASSWORD_POLICY_MESSAGE,
  checkPasswordPolicy,
  isPasswordPolicyCompliant,
} from './passwordPolicy.js';
