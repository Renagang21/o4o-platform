/**
 * Authorization Middleware — Role & Permission Guards
 *
 * Extracted from auth.middleware.ts (WO-O4O-AUTH-MIDDLEWARE-SPLIT-V1)
 * Contains: requireAdmin, requireRole
 */
import { Response, NextFunction } from 'express';
import { User } from '../../../modules/auth/entities/User.js';
import { roleAssignmentService } from '../../../modules/auth/services/role-assignment.service.js';
import logger from '../../../utils/logger.js';
import { AuthRequest } from './auth-context.helpers.js';
import { requireAuth } from './authentication.middleware.js';

/**
 * 인증 보장 헬퍼 — WO-O4O-REQUIREADMIN-MIDDLEWARE-CONTRACT-HARDENING-V1
 *
 * 기존 구현은 `req.user` 가 없을 때 `return requireAuth(req, res, next)` 로 위임했다.
 * 그러면 인증에 성공한 순간 requireAuth 가 **직접 next() 를 호출**해 컨트롤러로 넘어가고,
 * 위임한 쪽(requireAdmin/requireRole/...)의 **역할 검사는 영원히 실행되지 않는다.**
 * 즉 단독 사용 시 "로그인만 하면 통과" 가 된다.
 *
 * 이 헬퍼는 requireAuth 를 호출하되 next 를 가로채서, 인증이 끝난 뒤 **호출자에게 제어를 돌려준다.**
 * - true  → 인증 완료(req.user 확보). 호출자가 역할 검사를 계속한다.
 * - false → requireAuth 가 이미 401 응답을 보냈다. 호출자는 아무것도 하지 않고 종료한다.
 */
async function ensureAuthenticated(req: AuthRequest, res: Response): Promise<boolean> {
  if (req.user) return true;

  let authenticated = false;
  await requireAuth(req, res, ((err?: unknown) => {
    if (!err) authenticated = true;
  }) as NextFunction);

  return authenticated && !!req.user;
}

/**
 * Require Admin Role Middleware
 *
 * WO-O4O-REQUIREADMIN-PREFIXED-ONLY-V1
 *
 * Requires the user to be authenticated AND have a platform-level prefixed admin role.
 * This should be chained after requireAuth or used standalone (it calls requireAuth internally).
 *
 * Accepted roles:
 * - platform:super_admin
 *
 * Legacy unprefixed roles (admin, super_admin) are no longer accepted.
 * Data migration completed: WO-O4O-LEGACY-ROLE-MIGRATION-V1 (2026-05-22)
 *
 * Returns 403 if user lacks admin privileges.
 *
 * @example
 * ```typescript
 * router.delete('/users/:id', requireAdmin, AdminController.deleteUser);
 * ```
 */
export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  // 인증 확인 → 역할 확인까지 이 미들웨어 안에서 완결한다 (단독 사용 안전).
  if (!(await ensureAuthenticated(req, res))) return;

  const user = req.user as User;

  try {
    // WO-O4O-REQUIREADMIN-PREFIXED-ONLY-V1: platform: prefix 필수
    const isAdmin = await roleAssignmentService.hasAnyRole(user.id, [
      'platform:super_admin',
    ]);

    if (!isAdmin) {
      logger.warn('[requireAdmin] Unauthorized admin access attempt', {
        userId: user.id,
        email: user.email,
        path: req.path,
        method: req.method,
      });

      return res.status(403).json({
        success: false,
        error: 'Admin privileges required',
        code: 'FORBIDDEN',
      });
    }

    return next();
  } catch (error) {
    logger.error('[requireAdmin] Error checking admin role', {
      error: error instanceof Error ? error.message : String(error),
      userId: user.id,
    });

    return res.status(500).json({
      success: false,
      error: 'Error verifying admin access',
      code: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Require Specific Role(s) Middleware
 *
 * Requires the user to have one of the specified roles.
 * Uses P0 role_assignments table via RoleAssignmentService as the sole source of truth.
 *
 * @param roles - Single role string or array of role strings
 *
 * @example
 * ```typescript
 * router.get('/seller/dashboard', requireRole('seller'), SellerController.getDashboard);
 * router.get('/admin/reports', requireRole(['admin', 'operator']), ReportController.getReports);
 * ```
 */
export const requireRole = (roles: string | string[]) => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void | Response> => {
    // 인증 확인 → 역할/권한 확인까지 이 미들웨어 안에서 완결한다 (단독 사용 안전).
    if (!(await ensureAuthenticated(req, res))) return;

    const user = req.user as User;
    const roleList = Array.isArray(roles) ? roles : [roles];

    try {
      // P0 RBAC: Check roles using RoleAssignment service only
      const hasActiveRole = await roleAssignmentService.hasAnyRole(user.id, roleList);

      if (!hasActiveRole) {
        logger.warn('[requireRole] Unauthorized role access attempt', {
          userId: user.id,
          email: user.email,
          requiredRoles: roleList,
          path: req.path,
          method: req.method,
        });

        return res.status(403).json({
          success: false,
          error:
            roleList.length === 1
              ? `Active ${roleList[0]} role required`
              : `One of these roles required: ${roleList.join(', ')}`,
          code: 'ROLE_REQUIRED',
          details: {
            requiredRoles: roleList,
          },
        });
      }

      // Get active roles for request context
      const activeRoles = await roleAssignmentService.getActiveRoles(user.id);
      const matchedAssignment = activeRoles.find(a => roleList.includes(a.role));
      if (matchedAssignment) {
        req.roleAssignment = matchedAssignment;
      }

      next();
    } catch (error) {
      logger.error('[requireRole] Error checking role assignment', {
        error: error instanceof Error ? error.message : String(error),
        userId: user.id,
        roles: roleList,
      });

      return res.status(500).json({
        success: false,
        error: 'Error verifying role access',
        code: 'INTERNAL_ERROR',
      });
    }
  };
};

// ============================================================================
// WO-O4O-LEGACY-FOLLOWUP-AUTH-NOTIFICATION-CATALOG-AND-DB-FINAL-CLOSURE-V1 (A축):
//   `requirePermission` / `requireAnyPermission` 두 미들웨어를 제거했다.
//
//   - api-server 전체에서 route mount 0건이었다 (DEAD_UNMOUNTED).
//   - 두 미들웨어의 1차 판정은 users.permissions 컬럼 스냅샷 포함 검사였고,
//     프로덕션 users 57행 중 permissions 가 비어 있지 않은 행은 0건이다.
//     즉 grant-only 우회 분기는 실행된 적이 없다.
//   - RBAC canonical 경로는 `roleAssignmentService.hasPermission` /
//     `hasAnyRole` 이며, 실제 라우트는 `requireAuth` + `require{Service}Scope`
//     조합을 사용한다. 새 RBAC framework 를 만들지 않는다.
//
//   후속 정리 결과 (WO-O4O-FROZEN-AUTH-PERMISSIONS-DB-AND-KPA-SUPPLIER-ENDPOINT-FINAL-CLOSURE-V1):
//   - JWT `permissions` claim · account-linking 병합 · `getAllPermissions` 스냅샷 read 는 제거됨.
//   - `@o4o/organization-core` 의 `PermissionGuard` 는 소비처 0 으로 제거됨(A축 REMOVE_SAFE).
//   - `users.permissions` 컬럼은 WO-O4O-LEGACY-PRODUCTION-SCHEMA-AND-LOCAL-HOUSEKEEPING-
//     FINAL-CLOSURE-V1 에서 프로덕션 DROP 됐다
//     (`20270320000000-DropUsersPermissionsColumn`). 컬럼 재도입 금지 —
//     권한 SSOT 는 `role_assignments` 다 (CLAUDE.md F9).
// ============================================================================
