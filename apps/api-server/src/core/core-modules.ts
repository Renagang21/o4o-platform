/**
 * O4O Platform Core Module Registry
 * WO-O4O-CORE-FREEZE-V1 (2026-03-11)
 *
 * Core modules verified by E2E Round 4.
 * Do not modify without CORE_CHANGE approval.
 */

export const O4O_CORE_MODULES = [
  'auth',
  'memberships',
  'admin-users',
  'rbac',
] as const;

export type CoreModule = (typeof O4O_CORE_MODULES)[number];

/**
 * Core file paths (relative to apps/api-server/src/)
 * Any modification to these files requires CORE_CHANGE approval.
 */
export const O4O_CORE_FILES = {
  auth: [
    'modules/auth/entities/User.ts',
    'modules/auth/entities/RefreshToken.ts',
    'modules/auth/controllers/auth.controller.ts',
    'modules/auth/routes/auth.routes.ts',
    'modules/auth/services/user.service.ts',
    'modules/auth/services/refresh-token.service.ts',
    'common/middleware/auth.middleware.ts',
  ],
  memberships: [
    'modules/auth/entities/ServiceMembership.ts',
    'common/middleware/membership-guard.middleware.ts',
  ],
  'admin-users': [
    'controllers/admin/AdminUserController.ts',
    'routes/admin/users.routes.ts',
  ],
  rbac: [
    'modules/auth/entities/RoleAssignment.ts',
    'modules/auth/services/role-assignment.service.ts',
  ],
} as const;

/**
 * Core API endpoints — contract frozen
 */
export const O4O_CORE_ENDPOINTS = [
  'POST   /api/v1/auth/login',
  'POST   /api/v1/auth/register',
  'POST   /api/v1/auth/refresh',
  'GET    /api/v1/auth/status',
  'POST   /api/v1/auth/logout',
  'GET    /api/v1/admin/users',
  'PATCH  /api/v1/admin/users/:id/status',
  'PUT    /api/v1/admin/users/:id',
  'DELETE /api/v1/admin/users/:id',
] as const;
