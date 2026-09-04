/**
 * @core O4O_PLATFORM_CORE — Auth + RBAC
 * Core Middleware: requireAuth, requireAdmin, requireAnyRole
 * Do not modify without CORE_CHANGE approval.
 * Freeze: WO-O4O-CORE-FREEZE-V1 (2026-03-11)
 *
 * === Barrel Re-export ===
 * WO-O4O-AUTH-MIDDLEWARE-SPLIT-V1: Structure decomposition
 * Original 1,019-line file split into:
 *   - auth/auth-context.helpers.ts    — Types & shared utilities
 *   - auth/authentication.middleware.ts — Platform user authentication
 *   - auth/authorization.middleware.ts  — Role & permission guards
 *   - auth/service-access.middleware.ts — Service/Guest user authentication
 *
 * All existing imports continue to work through this barrel.
 */

// Types & helpers
export type {
  AuthRequest,
  ServiceAuthRequest,
  GuestAuthRequest,
  GuestOrServiceAuthRequest,
} from './auth/auth-context.helpers.js';

// Platform user authentication
export {
  requireAuth,
  optionalAuth,
  requirePlatformUser,
  authenticate,
  authenticateToken,
  authenticateCookie,
} from './auth/authentication.middleware.js';

// Role guards
// WO-O4O-LEGACY-FOLLOWUP-AUTH-NOTIFICATION-CATALOG-AND-DB-FINAL-CLOSURE-V1 (A축):
//   permission 스냅샷 guard 2종의 재수출 제거 (원본 미들웨어 은퇴 · route mount 0건).
export {
  requireAdmin,
  requireRole,
} from './auth/authorization.middleware.js';

// Service & Guest user authentication
export {
  requireServiceUser,
  optionalServiceAuth,
  requireGuestUser,
  requireGuestOrServiceUser,
  optionalGuestOrServiceAuth,
} from './auth/service-access.middleware.js';
