/**
 * WO-O4O-ADMIN-MEMBERSHIP-API-AUTHORIZATION-GUARD-V2
 *
 * 관리자용 Membership API 보호.
 *
 * 배경
 * ----
 * `/api/v1/membership` 는 인증 미들웨어 없이 mount 되어 있었다
 * (WO-O4O-ADMIN-MEMBERSHIP-CATEGORY-AUTHORIZATION-AUDIT-V1 참조).
 * `@o4o/membership-yaksa` 는 packages 계층이므로 apps/api-server 의
 * 미들웨어를 import 할 수 없다. 따라서 guard 는 **mount 지점**에서 건다.
 * (선례: register-routes.ts 의 `app.use('/api/v1/lms', kpaLmsScopeGuard)`)
 *
 * 원칙
 * ----
 * - `/api/v1/membership` **전체**에는 관리자 guard 를 걸지 않는다.
 *   회원 본인용 경로(`/members/me`, `/members/me/summary`)가 같은 router 에 섞여 있다.
 * - 관리자 전용 subtree 에만 건다.
 * - `/members` 는 관리자·본인용 혼합이므로 본인용 경로만 통과시키는
 *   선택적 guard 를 사용한다.
 * - 신규 역할·권한 체계를 만들지 않는다. 기존 `authenticate` + `requireRole` 만 사용한다.
 */
import type { Application, NextFunction, Request, RequestHandler, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import logger from '../utils/logger.js';

/**
 * 허용 역할.
 *
 * 회원 분류·회원 목록은 serviceKey / organizationId 가 없는 **플랫폼 전역 데이터**이므로
 * 서비스 단위 역할(kpa:admin 등)로는 관리 범위를 제한할 경계가 없다.
 * routes/admin/users.routes.ts 의 ADMIN_ROLES 와 동일한 목록을 사용한다.
 */
export const MEMBERSHIP_ADMIN_ROLES = ['platform:super_admin'];

/**
 * WO-O4O-MEMBERSHIP-RESIDUAL-SUBTREE-GUARD-V1 — `organizationId` scope 에 대한 판단 근거
 *
 * `/organizations/:organizationId/members` 는 요청자가 URL 로 조직을 지정한다.
 * "URL 의 organizationId 를 신뢰하지 않는다" 는 요구를 **접근 주체를 좁히는 방식**으로 만족시킨다.
 *
 *   - 비로그인 → 401
 *   - 일반 사용자 / 서비스 역할(kpa:admin 등) → 403  → **어떤 조직도 조회할 수 없다**
 *   - platform:super_admin → 통과 (플랫폼 전역 관리자이므로 cross-org 가 정상)
 *
 * 즉 "임의 organizationId 로 남의 조직 회원을 조회" 할 수 있는 주체가 **존재하지 않는다**.
 * 통과 가능한 유일한 주체가 이미 전 조직에 대한 권한을 가진 플랫폼 관리자이기 때문에,
 * 여기에 추가로 조직 소유권 필터를 걸면 **정상 권한을 축소**할 뿐 보안 이득이 없다.
 *
 * 조직 관리자(organization_members 의 owner/admin/manager, 또는
 * role_assignments 의 scopeType='organization')에게 자기 조직 회원 조회를 **위임**하는 것은
 * 현재 없는 권한을 새로 **부여**하는 정책 확대이므로 이 WO(보호 강화) 범위 밖이다.
 * 필요하면 별도 WO 에서 설계한다.
 */
export const MEMBERSHIP_ORG_SCOPE_POLICY = 'platform-admin-only' as const;

/** mount 전체가 관리자 전용인 subtree. */
export const MEMBERSHIP_ADMIN_SUBTREES = [
  '/api/v1/membership/categories',
  '/api/v1/membership/export',
  '/api/v1/membership/stats',
  '/api/v1/membership/verifications',

  // ── WO-O4O-MEMBERSHIP-RESIDUAL-SUBTREE-GUARD-V1 ──────────────────────────
  // 상위 경계 밖에 남아 있던 잔여 subtree 4종.
  // 전수 조사 결과 **네 subtree 안에 공개(비로그인) 계약 endpoint 는 없다.**
  // 회원 본인용 endpoint 는 모두 `/members/:memberId/...` 아래에 따로 mount 돼 있어
  // 이미 `membersSelective` guard 로 보호된다(§아래 표).
  //
  //   subtree                    | endpoint | 성격
  //   ---------------------------|----------|-------------------------------------
  //   /audit-logs                | GET 4    | 회원 변경 감사 기록 조회 (관리자)
  //   /affiliations              | PUT/DEL  | 소속 정보 수정·삭제 (관리자 write)
  //   /organizations/:id/members | GET 2    | 조직 회원 목록·이력 (관리자)
  //   /license-verification      | 8        | 면허 검증 요청·승인·실패처리 (관리자)
  //
  // 회원 본인용(이미 보호됨, 여기서 변경하지 않음):
  //   /members/:memberId/affiliations · /members/:memberId/logs
  //   /members/:memberId/license-verification
  //
  // `/organizations` 는 하위에 `:organizationId/members` 만 존재하므로
  // path parameter 없이 subtree 째로 건다(guard 가 파라미터 해석에 의존하지 않게 한다).
  '/api/v1/membership/audit-logs',
  '/api/v1/membership/affiliations',
  '/api/v1/membership/organizations',
  '/api/v1/membership/license-verification',
];

/**
 * 이번 WO 로 새로 보호된 subtree (회귀 추적용).
 * `MEMBERSHIP_ADMIN_SUBTREES` 의 부분집합이다.
 */
export const MEMBERSHIP_RESIDUAL_SUBTREES = [
  '/api/v1/membership/audit-logs',
  '/api/v1/membership/affiliations',
  '/api/v1/membership/organizations',
  '/api/v1/membership/license-verification',
];

/** `/members` router 안에서 회원 본인이 사용하는 경로 (guard 제외). */
export const MEMBER_SELF_PATHS = ['/me', '/me/summary'];

/** `/api/v1/membership/members` 기준 상대 경로가 회원 본인용인지 판정한다. */
export function isMemberSelfPath(path: string): boolean {
  if (!path) return false;
  const withoutQuery = path.split('?')[0];
  const normalized = withoutQuery.replace(/\/+$/, '') || '/';
  return MEMBER_SELF_PATHS.includes(normalized);
}

/** 여러 미들웨어를 하나로 합성한다 (Express 내부 chain 과 동일한 순차 실행). */
function chain(handlers: RequestHandler[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    let index = 0;
    const step = (err?: unknown): void => {
      if (err) return next(err as Error);
      const handler = handlers[index++];
      if (!handler) return next();
      handler(req, res, step as NextFunction);
    };
    step();
  };
}

export interface MembershipAdminGuardDeps {
  authenticate: RequestHandler;
  requireRole: (roles: string[]) => RequestHandler;
}

const defaultDeps: MembershipAdminGuardDeps = {
  authenticate: authenticate as RequestHandler,
  requireRole: requireRole as (roles: string[]) => RequestHandler,
};

/**
 * guard 2종을 만든다.
 * - `adminOnly`      : subtree 전체 보호
 * - `membersSelective`: 본인용 경로만 통과, 나머지는 관리자 전용
 */
export function createMembershipAdminGuards(
  deps: MembershipAdminGuardDeps = defaultDeps,
): { adminOnly: RequestHandler; membersSelective: RequestHandler } {
  const adminOnly = chain([deps.authenticate, deps.requireRole(MEMBERSHIP_ADMIN_ROLES)]);

  const membersSelective: RequestHandler = (req, res, next) => {
    if (isMemberSelfPath(req.path)) return next();
    return adminOnly(req, res, next);
  };

  return { adminOnly, membersSelective };
}

/**
 * `app.use('/api/v1/membership', createMembershipRoutes(...))` **직전**에 호출한다.
 * Express 는 등록 순서대로 매칭하므로 guard 가 먼저 등록되어야 한다.
 */
export function registerMembershipAdminGuards(
  app: Application,
  deps: MembershipAdminGuardDeps = defaultDeps,
): void {
  const { adminOnly, membersSelective } = createMembershipAdminGuards(deps);

  for (const subtree of MEMBERSHIP_ADMIN_SUBTREES) {
    app.use(subtree, adminOnly);
  }
  app.use('/api/v1/membership/members', membersSelective);

  logger.info(
    `✅ Membership admin guards registered (${MEMBERSHIP_ADMIN_SUBTREES.length} subtrees + /members, self paths exempt: ${MEMBER_SELF_PATHS.join(', ')})`,
  );
}
