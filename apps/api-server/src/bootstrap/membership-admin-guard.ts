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
export const MEMBERSHIP_ADMIN_ROLES = ['platform:admin', 'platform:super_admin'];

/** mount 전체가 관리자 전용인 subtree. */
export const MEMBERSHIP_ADMIN_SUBTREES = [
  '/api/v1/membership/categories',
  '/api/v1/membership/export',
  '/api/v1/membership/stats',
  '/api/v1/membership/verifications',
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
