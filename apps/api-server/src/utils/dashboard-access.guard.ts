/**
 * Dashboard / Organization Access Guard
 *
 * WO-O4O-AUTH-ONLY-ROUTE-GUARD-HARDENING-V1
 *
 * `requireAuth` 는 "로그인했는가" 만 판정한다. 소유권·조직 권한 판정 축이 아니다.
 * 클라이언트가 보낸 `dashboardId` / `organizationId` 는 **조회 대상 지정에만** 사용하고,
 * 접근 허용 여부는 항상 서버 SSOT 로 재검증한다.
 *
 * SSOT (코드 근거):
 * - `services/web-kpa-society/src/pages/dashboard/MyContentPage.tsx` → `const dashboardId = user?.id`
 * - `services/web-neture/src/pages/dashboard/MyContentPage.tsx`      → `const dashboardId = user?.id`
 * - `services/web-k-cosmetics/src/pages/library/ContentLibraryPage.tsx` → `targetDashboardId: userId`
 * - `dashboard-assets.copy-handlers.ts` → `organizationId: targetDashboardId`
 *
 * 즉 `cms_media."organizationId"` 는 실제로 **소유자 user id** 를 담는 컬럼이며,
 * 별도의 dashboard 원장 테이블은 존재하지 않는다. 따라서 신규 테이블 / 신규 ACL 없이
 * 아래 3가지 근거만으로 접근을 판정한다.
 *
 *   1. self         — dashboardId === 인증 사용자 id (표준 경로)
 *   2. organization — dashboardId 가 사용자가 현재 소속된 organization id (organization_members)
 *   3. admin        — platform:admin / platform:super_admin
 *
 * 신규 테이블 0 / migration 0 / 신규 role 0.
 */

import type { DataSource } from 'typeorm';
import { roleAssignmentService } from '../modules/auth/services/role-assignment.service.js';
import logger from './logger.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AccessScope = 'self' | 'organization' | 'admin';

export type AccessDenialCode =
  | 'UNAUTHORIZED'      // 401 — 미인증
  | 'INVALID_REQUEST'   // 400 — 식별자 누락 / 형식 오류
  | 'FORBIDDEN';        // 403 — 인증됐으나 대상에 대한 권한 없음

export interface AccessDecision {
  allowed: boolean;
  /** 허용된 경우 어떤 근거로 허용되었는지 */
  scope?: AccessScope;
  /** 거부된 경우의 HTTP 대응 코드 */
  code?: AccessDenialCode;
  status?: 401 | 400 | 403;
  message?: string;
}

const DENY = (code: AccessDenialCode, status: 401 | 400 | 403, message: string): AccessDecision => ({
  allowed: false,
  code,
  status,
  message,
});

/**
 * 사용자가 현재 활성 상태로 소속된 organization 인지 확인한다.
 *
 * `organization_members` 는 탈퇴를 `left_at` 으로 표현한다 (status 컬럼 없음).
 * Raw SQL 은 반드시 $n binding (Boundary Policy Guard Rule ②).
 */
async function isActiveOrganizationMember(
  dataSource: DataSource,
  userId: string,
  organizationId: string
): Promise<boolean> {
  try {
    const rows = await dataSource.query(
      `SELECT 1
         FROM organization_members
        WHERE user_id = $1
          AND organization_id = $2
          AND left_at IS NULL
        LIMIT 1`,
      [userId, organizationId]
    );
    return rows.length > 0;
  } catch (error: any) {
    // 조회 실패를 "권한 있음" 으로 삼키지 않는다 — 실패는 곧 거부다.
    logger.error('[accessGuard] organization membership lookup failed', {
      userId,
      organizationId,
      error: error?.message,
    });
    return false;
  }
}

/**
 * 클라이언트가 지정한 dashboardId 에 대한 접근 권한을 판정한다.
 *
 * @param user  req.user (인증 미들웨어가 채운 값)
 * @param rawDashboardId  클라이언트가 보낸 식별자 (query / body / param)
 */
export async function checkDashboardAccess(
  dataSource: DataSource,
  user: { id?: string } | undefined,
  rawDashboardId: unknown
): Promise<AccessDecision> {
  if (!user?.id) {
    return DENY('UNAUTHORIZED', 401, '로그인이 필요합니다.');
  }

  if (rawDashboardId === undefined || rawDashboardId === null || rawDashboardId === '') {
    return DENY('INVALID_REQUEST', 400, 'dashboardId는 필수입니다.');
  }

  if (typeof rawDashboardId !== 'string' || !UUID_RE.test(rawDashboardId)) {
    return DENY('INVALID_REQUEST', 400, 'dashboardId 형식이 올바르지 않습니다.');
  }

  // 1. 본인 대시보드 (표준 경로)
  if (rawDashboardId === user.id) {
    return { allowed: true, scope: 'self' };
  }

  // 2. 소속 조직 대시보드
  if (await isActiveOrganizationMember(dataSource, user.id, rawDashboardId)) {
    return { allowed: true, scope: 'organization' };
  }

  // 3. 플랫폼 관리자 (기존 requireAdmin 과 동일 기준)
  try {
    const isAdmin = await roleAssignmentService.hasAnyRole(user.id, [
      'platform:admin',
      'platform:super_admin',
    ]);
    if (isAdmin) {
      return { allowed: true, scope: 'admin' };
    }
  } catch (error: any) {
    logger.error('[accessGuard] admin role lookup failed', { userId: user.id, error: error?.message });
  }

  return DENY('FORBIDDEN', 403, '해당 대시보드에 접근할 권한이 없습니다.');
}

/**
 * 거부 결정을 표준 JSON 응답으로 변환한다.
 * 거부 사유(actor / target / action / reason)는 로그에 남기되 payload 전체는 남기지 않는다.
 */
export function respondAccessDenied(
  res: { status: (code: number) => { json: (body: unknown) => unknown } },
  decision: AccessDecision,
  context: { userId?: string; target?: unknown; action: string }
): void {
  if (decision.status === 403) {
    logger.warn('[accessGuard] access denied', {
      actorUserId: context.userId ?? null,
      action: context.action,
      target: typeof context.target === 'string' ? context.target : null,
      reason: decision.code,
    });
  }

  res.status(decision.status ?? 403).json({
    success: false,
    error: { code: decision.code ?? 'FORBIDDEN', message: decision.message ?? '권한이 없습니다.' },
  });
}
