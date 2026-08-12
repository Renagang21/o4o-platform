/**
 * KPA Branch Routes
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1
 *
 *   GET    /api/v1/kpa-branch/service-info                                   (public)
 *   GET    /api/v1/kpa-branch/branches                                       (public)  분회 목록
 *   GET    /api/v1/kpa-branch/resolve                                        (public)  Host → 분회
 *   GET    /api/v1/kpa-branch/branches/:branchSlug                           (public)  분회 단건
 *   GET    /api/v1/kpa-branch/branches/:branchSlug/site                      (public)  게시된 홈페이지
 *   GET    /api/v1/kpa-branch/branches/:branchSlug/posts                     (public)  공지/자료실
 *   POST   /api/v1/kpa-branch/join                                           (public)  서비스 가입 신청
 *   GET    /api/v1/kpa-branch/join/status                                    (auth)    내 가입 상태
 *   GET    /api/v1/kpa-branch/me/access                                      (auth)
 *   GET    /api/v1/kpa-branch/me/branch                                      (auth)    내 현재 분회
 *   GET    /api/v1/kpa-branch/me/branch/history                              (auth)    전입·전출 이력
 *   *      /api/v1/kpa-branch/branches/:branchSlug/operator/**               (operator scope + 분회 경계)
 *   *      /api/v1/kpa-branch/admin/domains/**                               (admin scope)
 *   *      /api/v1/kpa-branch/admin/service-members/**                        (admin scope)  가입 승인
 *
 * 가드 2겹 (합치지 않는다):
 *   requireAuth → requireKpaBranchScope(서비스 축) → resolveBranch → requireBranchScope(분회 축)
 *
 * 분회별 별도 백엔드를 만들지 않는다. 모든 분회가 이 라우터 하나를 공유하고
 * tenant 는 :branchSlug 또는 Host 헤더로만 결정된다.
 */

import { Router } from 'express';
import { getService } from '../../config/service-catalog.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import {
  requireKpaBranchScope,
  resolveBranch,
  requireBranchScope,
  findBranchByHostname,
} from '../../middleware/kpa-branch-scope.middleware.js';
import { BranchDirectoryController } from '../../controllers/kpa-branch/BranchDirectoryController.js';
import { BranchMemberController } from '../../controllers/kpa-branch/BranchMemberController.js';
import { BranchSiteController } from '../../controllers/kpa-branch/BranchSiteController.js';
import { BranchDomainController } from '../../controllers/kpa-branch/BranchDomainController.js';
import { BranchJoinController } from '../../controllers/kpa-branch/BranchJoinController.js';
import { BranchServiceMembershipController } from '../../controllers/kpa-branch/BranchServiceMembershipController.js';

const SERVICE_KEY = SERVICE_KEYS.KPA_BRANCH;

/** async 핸들러 오류를 express 에 위임 */
const wrap =
  (fn: (req: any, res: any) => Promise<unknown>) =>
  (req: any, res: any, next: any) =>
    fn(req, res).catch(next);

export function createKpaBranchRoutes(): Router {
  const router = Router();

  // ── public ────────────────────────────────────────────────────────────────

  router.get('/service-info', (_req, res) => {
    const svc = getService(SERVICE_KEY);
    if (!svc) {
      return res.status(500).json({
        success: false,
        error: 'KPA Branch service is not registered in the service catalog',
        code: 'SERVICE_NOT_REGISTERED',
      });
    }
    return res.json({
      success: true,
      data: {
        serviceKey: svc.key,
        name: svc.name,
        nameKo: svc.nameKo ?? svc.name,
        domain: svc.domain,
        description: svc.description,
        joinEnabled: svc.joinEnabled,
      },
    });
  });

  router.get('/branches', wrap(BranchDirectoryController.list));

  /** Host 헤더 → 분회 해석 (자체 도메인 진입 시 프론트가 tenant 를 확정하는 경로) */
  router.get(
    '/resolve',
    wrap(async (req, res) => {
      const host = (req.query.host as string) || (req.headers['x-forwarded-host'] as string) || req.headers.host || '';
      const branch = host ? await findBranchByHostname(host) : null;
      if (!branch) {
        return res.status(404).json({ success: false, error: '연결된 분회가 없습니다.', code: 'BRANCH_NOT_FOUND' });
      }
      return res.json({ success: true, data: branch });
    }),
  );

  router.get('/branches/:branchSlug', resolveBranch, wrap(BranchDirectoryController.detail));
  router.get('/branches/:branchSlug/site', resolveBranch, wrap(BranchSiteController.publicSite));
  router.get('/branches/:branchSlug/posts', resolveBranch, wrap(BranchSiteController.publicPosts));

  // ── 서비스 가입 (Identity V2 canonical write-path 위임) ───────────────────
  //
  // 가입 신청은 공통 register 경로로 위임되어 service_memberships(pending) 와
  // service_credentials(kpa-branch 전용 비밀번호)를 한 트랜잭션에서 만든다.
  // 분회 소속(branch_memberships)은 여기서 만들지 않는다 — 축을 합치지 않는다.
  //
  // service-catalog 의 joinEnabled 는 false 로 유지한다. 공통 handoff join 은
  // credential 없이 membership 만 만들기 때문에 이 서비스에서는 사용하지 않는다.
  router.post('/join', wrap(BranchJoinController.apply));
  router.get('/join/status', requireAuth as any, wrap(BranchJoinController.myStatus));

  // ── auth (본인 축) ────────────────────────────────────────────────────────

  /** 서비스 접근 상태 + 내 분회. 서비스 축(memberships)과 분회 축을 각각 별도 필드로 낸다. */
  router.get(
    '/me/access',
    requireAuth as any,
    wrap(async (req, res) => {
      const user = req.user ?? {};
      const memberships: { serviceKey: string; status: string }[] = user.memberships || [];
      const membershipStatus = memberships.find((m) => m.serviceKey === SERVICE_KEY)?.status ?? 'none';
      const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
      const serviceRoles = roles.filter((r) => r.startsWith(`${SERVICE_KEY}:`));
      const { branchMembershipService } = await import('../../services/kpa-branch/BranchMembershipService.js');
      const current = await branchMembershipService.getCurrent(user.id);

      return res.json({
        success: true,
        data: {
          serviceKey: SERVICE_KEY,
          membershipStatus,
          roles: serviceRoles,
          currentBranch: current
            ? { organizationId: current.organization_id, joinedAt: current.joined_at }
            : null,
          entryPoints: {
            member: serviceRoles.includes(`${SERVICE_KEY}:member`),
            operator: serviceRoles.includes(`${SERVICE_KEY}:operator`),
            admin: serviceRoles.includes(`${SERVICE_KEY}:admin`),
          },
        },
      });
    }),
  );

  router.get('/me/branch', requireAuth as any, wrap(BranchMemberController.myCurrent));
  router.get('/me/branch/history', requireAuth as any, wrap(BranchMemberController.myHistory));

  // ── operator (서비스 축 + 분회 축 이중 가드) ──────────────────────────────

  const operatorGuards = [
    requireAuth as any,
    requireKpaBranchScope(`${SERVICE_KEY}:operator`),
    resolveBranch,
    requireBranchScope,
  ];

  router.get('/branches/:branchSlug/operator/members', ...operatorGuards, wrap(BranchMemberController.list));
  router.post('/branches/:branchSlug/operator/members', ...operatorGuards, wrap(BranchMemberController.join));
  router.post(
    '/branches/:branchSlug/operator/members/:userId/leave',
    ...operatorGuards,
    wrap(BranchMemberController.leave),
  );

  router.get('/branches/:branchSlug/operator/site', ...operatorGuards, wrap(BranchSiteController.operatorSite));
  router.put('/branches/:branchSlug/operator/site', ...operatorGuards, wrap(BranchSiteController.upsertSite));

  router.get('/branches/:branchSlug/operator/posts', ...operatorGuards, wrap(BranchSiteController.operatorPosts));
  router.post('/branches/:branchSlug/operator/posts', ...operatorGuards, wrap(BranchSiteController.createPost));
  router.patch(
    '/branches/:branchSlug/operator/posts/:postId',
    ...operatorGuards,
    wrap(BranchSiteController.updatePost),
  );
  router.delete(
    '/branches/:branchSlug/operator/posts/:postId',
    ...operatorGuards,
    wrap(BranchSiteController.deletePost),
  );

  router.get('/branches/:branchSlug/operator/domains', ...operatorGuards, wrap(BranchDomainController.list));
  router.post('/branches/:branchSlug/operator/domains', ...operatorGuards, wrap(BranchDomainController.create));
  router.post(
    '/branches/:branchSlug/operator/domains/:domainId/verify-request',
    ...operatorGuards,
    wrap(BranchDomainController.requestVerification),
  );
  router.delete(
    '/branches/:branchSlug/operator/domains/:domainId',
    ...operatorGuards,
    wrap(BranchDomainController.remove),
  );

  // ── admin (서비스 전체 축) ────────────────────────────────────────────────

  const adminGuards = [requireAuth as any, requireKpaBranchScope(`${SERVICE_KEY}:admin`)];

  router.get('/admin/domains', ...adminGuards, wrap(BranchDomainController.adminList));
  router.patch('/admin/domains/:domainId/status', ...adminGuards, wrap(BranchDomainController.adminSetStatus));

  // 서비스 가입 승인 — 서비스 축(service_memberships)이므로 분회 경계 가드를 붙이지 않는다.
  // 분회 운영자는 분회 소속(branch_memberships)만 다루고 서비스 접근 승인은 서비스 관리자 몫이다.
  router.get('/admin/service-members', ...adminGuards, wrap(BranchServiceMembershipController.list));
  router.patch(
    '/admin/service-members/:membershipId/approve',
    ...adminGuards,
    wrap(BranchServiceMembershipController.approve),
  );
  router.patch(
    '/admin/service-members/:membershipId/reject',
    ...adminGuards,
    wrap(BranchServiceMembershipController.reject),
  );

  return router;
}
