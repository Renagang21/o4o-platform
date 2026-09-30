export type { ApiUser, ParsedAuthResponse, RoleMap } from './types.js';
export { parseAuthResponse } from './parseAuthResponse.js';
export { normalizeUser } from './normalizeUser.js';
export { AUTH_ERROR_MESSAGES, ACCOUNT_STATUS_MESSAGES, resolveAuthError } from './errorMessages.js';
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
// WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 §2-2:
//   이메일·비밀번호 인증의 판정 규칙 정본(정규화 · 정책 · 마스킹). 화면과 서버가 같은 함수를 쓴다.
//   아래 은퇴 주석의 옛 policy 를 되살린 것이 아니다 — 이 WO 에서 새로 확정한 규칙이다.
export type { PasswordViolation } from './emailCredential.js';
export {
  normalizeLoginEmail,
  isLoginEmailShapeValid,
  PASSWORD_POLICY,
  PASSWORD_POLICY_MESSAGES,
  PASSWORD_POLICY_HINT,
  checkPasswordPolicy,
  isPasswordPolicyMet,
  passwordUtf8ByteLength,
  isPasswordWithinByteLimit,
  maskLoginEmail,
} from './emailCredential.js';

// WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
//   password policy(WO-O4O-PASSWORD-COMPLEXITY-POLICY-UNIFY-V1) 는 은퇴했다 — 검사할 비밀번호가 없다.
