import { hasCommunityServiceAdmin } from '../services/community/community-service-operator-access.js';
import { CommunityMemberManagementService, type CommunityMemberAction } from '../services/community/community-member-management.service.js';
import { CommunityMembershipMutationError } from '../services/community/community-membership-mutations.js';
import { forumRequestService } from '../services/forum/ForumRequestService.js';
/**
 * Communities — Community Catalog read contract (service-neutral)
 *
 * WO-O4O-COMMUNITY-WORKSPACE-CATALOG-AND-ACCESS-ALIGNMENT-V1
 *
 *   GET /api/v1/communities              — active Community 목록 + 현재 사용자의 참여 가능 여부
 *   GET /api/v1/communities/:communityKey/access — 한 Community 의 참여 판정
 *
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §3 — 개설·가입 경로 추가
 *
 *   POST /requests                             개설 신청 (slug 검사 1회차)
 *   GET  /requests/mine                        내 신청 이력 (slug_conflict 재신청 안내 도달점)
 *   GET  /requests                             승인 대기 목록        — community:operator 이상
 *   POST /requests/:requestId/approve          개설 승인 (검사 2회차) — community:operator 이상
 *   POST /requests/:requestId/reject           개설 거절             — community:operator 이상
 *   GET  /operating                            내가 운영하는 커뮤니티 (가입 심사 화면 진입 목록)
 *   POST /:communitySlug/join                  가입 신청 (승인형 하나)
 *   GET  /:communitySlug/memberships           가입 신청·회원 목록    — 그 커뮤니티 operator
 *   POST /:communitySlug/memberships/:membershipId/approve  가입 승인 — 그 커뮤니티 operator
 *   POST /:communitySlug/memberships/:membershipId/reject   가입 거절 — 그 커뮤니티 operator
 *
 * 두 심사 주체가 **다른 축**이라는 점이 요점이다:
 *   개설 심사 = 아직 어떤 커뮤니티에도 속하지 않은 요청 -> 서비스 전체 역할 `community:operator` 이상
 *   가입 심사 = 그 커뮤니티 안의 일 -> 개체 운영자 (`requireCommunityScope('operator')`)
 * 개설 승인으로 만들어지는 첫 운영자는 **개체 운영자일 뿐** 서비스 전체 역할을 받지 않는다.
 *
 * 계약:
 *   - 카탈로그 조회 경로(`/` · `/:communityKey/access`)는 종전대로 **조회 전용**이다.
 *   - 판정은 `resolveCommunityAccess`(community catalog policy) 한 곳 — 프런트가
 *     `if (hasKpaMembership)` 를 반복 구현하지 않는다 (WO §18).
 *   - 사용자 id 는 세션에서만 온다. 참여 자격은 DB 의 현재 service_memberships 로 판정한다
 *     (JWT payload 가 오래됐을 수 있으므로 `freshenUserContext` 로 갱신 — 읽기 전용).
 *   - 비로그인도 200 으로 목록을 돌려주되 canParticipate=false · reason=AUTH_REQUIRED (공개 read 정책과 분리).
 */

import { NetureMainMembershipRequiredError } from '../modules/neture/services/neture-main-membership.js';
import { createServiceForumRouter } from './forum/service-forum.routes.js';
import { listCommunityWorkspaces, resolveCommunityWorkspace, createCommunityBoard } from '../services/community/community-workspace.service.js';
import { Router, type RequestHandler, type Response } from 'express';
import { asyncHandler } from '../middleware/error-handler.js';
import type { AuthRequest } from '../types/auth.js';
import { AppDataSource } from '../database/connection.js';
// CodeQL(js/missing-rate-limiting) 이 인식하는 limiter 를 쓴다(선례: admin/platform-accounts.routes).
import { apiLimiter } from '../middleware/rateLimiter.js';
import { resolveCommunity, requireCommunityScope } from '../middleware/community-scope.middleware.js';
import { requireCommunityServiceScope } from '../middleware/community-service-scope.middleware.js';
import {
  CommunityLifecycleService,
  CommunityLifecycleError,
} from '../services/community/community-lifecycle.service.js';
import {
  CommunityOperatorDesignationError,
  CommunityOperatorDesignationService,
} from '../services/community/community-operator-designation.service.js';
import { freshenUserContext } from '../services/auth/auth-context.helper.js';
import {
  type CommunityAccessUser,
} from '../utils/community-access.resolver.js';

async function currentCommunityUser(req: AuthRequest): Promise<CommunityAccessUser | null> {
  const user = req.user;
  if (!user?.id) return null;
  const fresh = await freshenUserContext(user.id);
  return { id: user.id, roles: fresh.roles, memberships: fresh.memberships };
}

/** lifecycle 오류를 응답으로 옮긴다 — 라우트마다 분기를 복제하지 않는다. */
function sendLifecycleError(res: Response, error: unknown): boolean {
  if (error instanceof NetureMainMembershipRequiredError) {
    res.status(error.httpStatus).json({ success: false, error: error.message, code: error.code });
    return true;
  }
  if (!(error instanceof CommunityLifecycleError) && !(error instanceof CommunityMembershipMutationError)) return false;
  res.status(error.statusCode).json({ success: false, error: error.message, code: error.code });
  return true;
}

function lifecycle(): CommunityLifecycleService {
  return new CommunityLifecycleService(AppDataSource);
}

/** 인증된 사용자 id. 없으면 401 을 보내고 null 을 돌려준다. */
function requesterId(req: AuthRequest, res: Response): string | null {
  const id = req.user?.id;
  if (!id) {
    res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
    return null;
  }
  return id;
}

const MEMBERSHIP_STATUSES = ['pending', 'active', 'rejected', 'suspended', 'withdrawn'] as const;
type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

const bodyOf = (req: { body?: unknown }): Record<string, unknown> =>
  (req.body ?? {}) as Record<string, unknown>;
const trimmed = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

export function createCommunitiesRoutes(
  optionalAuth: RequestHandler,
  authenticate: RequestHandler,
): Router {
  const router = Router({ mergeParams: true });

  // 개체 운영자 경계: slug -> 행 확인 -> active 가입 -> role='operator'
  const operatorOnly: RequestHandler[] = [apiLimiter, authenticate, resolveCommunity, requireCommunityScope('operator')];
  // 서비스 전체 심사 경계
  const serviceOperatorOnly: RequestHandler[] = [apiLimiter, authenticate, requireCommunityServiceScope('community:operator')];
  const serviceAdminOnly: RequestHandler[] = [apiLimiter, authenticate, requireCommunityServiceScope('community:admin'),
    asyncHandler(async (req, res, next) => {
      // Entity designation belongs to explicitly assigned service admins; generic
      // platform bypass must not turn a central account into an entity operator.
      if (!await hasCommunityServiceAdmin(AppDataSource, (req as AuthRequest).user!.id)) {
        res.status(403).json({ success: false, code: 'COMMUNITY_SERVICE_ADMIN_REQUIRED', error: '지정된 커뮤니티 서비스 admin만 역할을 관리할 수 있습니다.' });
        return;
      }
      next();
    }),
  ];

  router.get(
    '/',
    optionalAuth,
    asyncHandler(async (req, res) => {
      const user = await currentCommunityUser(req as AuthRequest);
      res.json({ success: true, data: { communities: await listCommunityWorkspaces(AppDataSource, user) } });
    }),
  );

  // ── 개별 커뮤니티 운영자 지정·해제 (커뮤니티 서비스 운영자) ──────────────
  // WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 — Admin 은 서비스 Admin/Operator를 지정한다.
  //   개별 커뮤니티 운영자(community_memberships.role)는 서비스 운영자가 각 커뮤니티의 승인된 회원 중에서
  //   지정·해제한다. 가입 승인 자체는 여전히 개체 운영자(operatorOnly) 경로다.
  //   `/:communitySlug/...` 파라미터 라우트보다 먼저 등록한다.
  const designation = () => new CommunityOperatorDesignationService(AppDataSource);
  const sendDesignationError = (res: Response, error: unknown): boolean => {
    if (!(error instanceof CommunityOperatorDesignationError)) return sendLifecycleError(res, error);
    res.status(error.statusCode).json({ success: false, error: error.message, code: error.code });
    return true;
  };

  router.get(
    '/admin/communities',
    ...serviceAdminOnly,
    asyncHandler(async (_req, res) => {
      res.json({ success: true, data: { communities: await designation().listCommunities() } });
    }),
  );

  router.get(
    '/admin/communities/:communityId/members',
    ...serviceAdminOnly,
    asyncHandler(async (req, res) => {
      try {
        res.json({ success: true, data: await designation().listMembers(req.params.communityId) });
      } catch (error) {
        if (!sendDesignationError(res, error)) throw error;
      }
    }),
  );

  router.post(
    '/admin/communities/:communityId/members/:membershipId/role',
    ...serviceAdminOnly,
    asyncHandler(async (req, res) => {
      try {
        const data = await designation().setRole({
          communityId: req.params.communityId,
          membershipId: req.params.membershipId,
          role: trimmed(bodyOf(req).role) as 'admin' | 'operator' | 'member',
          actorUserId: (req as AuthRequest).user!.id,
          reason: trimmed(bodyOf(req).reason),
        });
        res.json({ success: true, data });
      } catch (error) {
        if (!sendDesignationError(res, error)) throw error;
      }
    }),
  );

  // ── 개설 ────────────────────────────────────────────────────────────
  // 신청은 인증만 요구하므로 **로그인한 누구나** 호출할 수 있다 — 1건마다 slug 조회 + INSERT 가
  // 나가므로 rate limit 을 붙인다(개설 신청 폭주 · DoS 차단).
  router.post(
    '/requests',
    apiLimiter,
    authenticate,
    asyncHandler(async (req, res) => {
      const userId = requesterId(req as AuthRequest, res);
      if (!userId) return;
      const body = bodyOf(req);
      const name = trimmed(body.name);
      if (!name) {
        res.status(400).json({ success: false, error: '커뮤니티 이름을 입력해야 합니다.', code: 'NAME_REQUIRED' });
        return;
      }
      try {
        const created = await lifecycle().requestCreation({
          requesterUserId: userId,
          desiredSlug: String(body.slug ?? ''),
          name,
          description: typeof body.description === 'string' ? body.description : null,
        });
        res.status(201).json({ success: true, data: created });
      } catch (error) {
        if (!sendLifecycleError(res, error)) throw error;
      }
    }),
  );

  /**
   * 내 신청 이력.
   * `slug_conflict` 로 돌아온 신청을 신청자가 스스로 확인할 수 있어야 한다 —
   * 그러지 않으면 재신청 안내가 어디에도 도달하지 않는다.
   */
  router.get(
    '/requests/mine',
    authenticate,
    asyncHandler(async (req, res) => {
      const userId = requesterId(req as AuthRequest, res);
      if (!userId) return;
      res.json({ success: true, data: { requests: await lifecycle().listMyCreationRequests(userId) } });
    }),
  );

  router.get(
    '/requests',
    ...serviceOperatorOnly,
    asyncHandler(async (_req, res) => {
      res.json({ success: true, data: { requests: await lifecycle().listPendingCreationRequests() } });
    }),
  );

  router.post(
    '/requests/:requestId/approve',
    ...serviceOperatorOnly,
    asyncHandler(async (req, res) => {
      const reviewerUserId = requesterId(req as AuthRequest, res);
      if (!reviewerUserId) return;
      try {
        // 선점 충돌은 실패가 아니라 **결과**다 — 신청자에게 재신청을 요청한 상태로 돌아온다.
        const result = await lifecycle().approveCreation({
          requestId: String(req.params.requestId),
          reviewerUserId,
        });
        res.json({ success: true, data: result });
      } catch (error) {
        if (!sendLifecycleError(res, error)) throw error;
      }
    }),
  );

  router.post(
    '/requests/:requestId/reject',
    ...serviceOperatorOnly,
    asyncHandler(async (req, res) => {
      const reviewerUserId = requesterId(req as AuthRequest, res);
      if (!reviewerUserId) return;
      const reason = trimmed(bodyOf(req).reason);
      if (!reason) {
        res.status(400).json({ success: false, error: '거절 사유를 입력해야 합니다.', code: 'REASON_REQUIRED' });
        return;
      }
      try {
        res.json({
          success: true,
          data: await lifecycle().rejectCreation({
            requestId: String(req.params.requestId),
            reviewerUserId,
            reason,
          }),
        });
      } catch (error) {
        if (!sendLifecycleError(res, error)) throw error;
      }
    }),
  );

  // ── 가입 ────────────────────────────────────────────────────────────
  /**
   * 내가 운영하는 커뮤니티 — 가입 심사 화면의 진입 목록.
   * 인증만 요구한다: 대상은 **세션 사용자 자신의** 개체 운영 행뿐이라 다른 사람 · 다른 커뮤니티가
   * 섞이지 않는다. 심사 자체는 여전히 `/:communitySlug/memberships*`(개체 운영자 가드)가 판정한다.
   * `/:communitySlug/...` 파라미터 경로와 겹치지 않도록 먼저 등록한다.
   */
  router.get(
    '/operating',
    apiLimiter,
    authenticate,
    asyncHandler(async (req, res) => {
      const userId = requesterId(req as AuthRequest, res);
      if (!userId) return;
      res.json({ success: true, data: { communities: await lifecycle().listOperatedCommunities(userId) } });
    }),
  );

  router.post(
    '/:communitySlug/join',
    apiLimiter,
    authenticate,
    resolveCommunity,
    asyncHandler(async (req, res) => {
      const userId = requesterId(req as AuthRequest, res);
      if (!userId) return;
      try {
        const membership = await lifecycle().requestJoin({ communityId: req.community!.id, userId });
        res.status(201).json({ success: true, data: membership });
      } catch (error) {
        if (!sendLifecycleError(res, error)) throw error;
      }
    }),
  );

  router.post('/:communitySlug/leave', apiLimiter, authenticate, resolveCommunity,
    asyncHandler(async (req, res) => {
      const actorUserId = requesterId(req as AuthRequest, res);
      if (!actorUserId) return;
      try {
        const data = await new CommunityMemberManagementService(AppDataSource).withdrawSelf({
          communityId: req.community!.id, actorUserId,
        });
        res.json({ success: true, data });
      } catch (error) { if (!sendLifecycleError(res, error)) throw error; }
    }),
  );

  router.get(
    '/:communitySlug/memberships',
    ...operatorOnly,
    asyncHandler(async (req, res) => {
      const raw = req.query.status;
      const status = typeof raw === 'string' && raw ? raw : undefined;
      if (status && !MEMBERSHIP_STATUSES.includes(status as MembershipStatus)) {
        res.status(400).json({ success: false, error: '알 수 없는 가입 상태입니다.', code: 'INVALID_STATUS' });
        return;
      }
      res.json({
        success: true,
        data: {
          memberships: await lifecycle().listMembershipsForReview({
            communityId: req.community!.id,
            status: status as MembershipStatus | undefined,
          }),
        },
      });
    }),
  );

  router.post(
    '/:communitySlug/memberships/:membershipId/approve',
    ...operatorOnly,
    asyncHandler(async (req, res) => {
      const reviewerUserId = requesterId(req as AuthRequest, res);
      if (!reviewerUserId) return;
      try {
        res.json({
          success: true,
          data: await lifecycle().approveJoin({
            communityId: req.community!.id,
            membershipId: String(req.params.membershipId),
            reviewerUserId,
          }),
        });
      } catch (error) {
        if (!sendLifecycleError(res, error)) throw error;
      }
    }),
  );

  router.post(
    '/:communitySlug/memberships/:membershipId/reject',
    ...operatorOnly,
    asyncHandler(async (req, res) => {
      const reviewerUserId = requesterId(req as AuthRequest, res);
      if (!reviewerUserId) return;
      try {
        res.json({
          success: true,
          data: await lifecycle().rejectJoin({
            communityId: req.community!.id,
            membershipId: String(req.params.membershipId),
            reviewerUserId,
            reason: typeof bodyOf(req).reason === 'string' ? (bodyOf(req).reason as string) : null,
          }),
        });
      } catch (error) {
        if (!sendLifecycleError(res, error)) throw error;
      }
    }),
  );

  router.get('/:communitySlug/memberships/:membershipId/history',
    apiLimiter, authenticate, resolveCommunity, requireCommunityScope('admin'),
    asyncHandler(async (req, res) => {
      const ids = [req.community!.id, String(req.params.membershipId)];
      const target = await AppDataSource.query('SELECT id FROM community_memberships WHERE community_id = $1 AND id = $2', ids);
      if (!target.length) { res.status(404).json({ success: false, code: 'MEMBERSHIP_NOT_FOUND', error: '가입 행을 찾을 수 없습니다.' }); return; }
      const changes = await AppDataSource.query(`SELECT h.id, h.action, h.before_role, h.after_role, h.before_status, h.after_status,
        h.reason, h.created_at, u.name AS actor_name FROM community_membership_changes h
        LEFT JOIN users u ON u.id = h.actor_user_id WHERE h.community_id = $1 AND h.membership_id = $2
        ORDER BY h.created_at DESC, h.id DESC LIMIT 50`, ids);
      res.json({ success: true, data: { changes } });
    }),
  );

  for (const action of ['suspend', 'restore', 'withdraw'] as const) {
    router.post(`/:communitySlug/memberships/:membershipId/${action}`,
      apiLimiter, authenticate, resolveCommunity, requireCommunityScope('admin'),
      asyncHandler(async (req, res) => {
        try {
          const data = await new CommunityMemberManagementService(AppDataSource).change({
            communityId: req.community!.id, membershipId: String(req.params.membershipId),
            actorUserId: (req as AuthRequest).user!.id, action: action as CommunityMemberAction,
            reason: trimmed(bodyOf(req).reason),
          });
          res.json({ success: true, data });
        } catch (error) { if (!sendLifecycleError(res, error)) throw error; }
      }),
    );
  }

  // Forum creation requests keep the existing state machine and historical storage codes.
  // Scope is always resolved on the server, never from client serviceCode/organizationId.
  router.all('/:communityKey/board-requests/:requestId?', apiLimiter, authenticate, asyncHandler(async (req, res) => {
    const user = await currentCommunityUser(req as AuthRequest);
    const workspace = await resolveCommunityWorkspace(AppDataSource, user, req.params.communityKey);
    if (!workspace?.allowed) { res.status(403).json({ success: false, code: 'COMMUNITY_ACCESS_REQUIRED' }); return; }
    const reviewer = { id: user!.id!, name: (req as AuthRequest).user?.name, email: (req as AuthRequest).user?.email };
    const body = bodyOf(req);
    let result: any;
    if (req.method === 'GET') {
      if (req.query.review === 'true' && !workspace.canManage) { res.status(403).json({ success: false, code: 'COMMUNITY_OPERATOR_REQUIRED' }); return; }
      const results = await Promise.all(workspace.forumStorageCodes.map(serviceCode =>
        req.query.review === 'true' ? forumRequestService.listByService({ serviceCode, status: 'pending', limit: 100 })
          : forumRequestService.listMy(user!.id!, serviceCode)));
      const failed = results.find(r => 'error' in r);
      if (failed) result = failed;
      else result = { data: results.flatMap(r => 'data' in r ? Array.isArray(r.data) ? r.data : r.data.data ?? [] : []) };
    } else if (req.method === 'POST' && !req.params.requestId) {
      result = await forumRequestService.create(reviewer, {
        serviceCode: workspace.forumStorageCodes[0], name: trimmed(body.name), description: trimmed(body.description),
        reason: trimmed(body.reason), forumType: body.forumType === 'closed' ? 'closed' : 'open',
        tags: Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === 'string') : [],
      });
    } else if (req.method === 'PATCH' && req.params.requestId && workspace.canManage) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.requestId)) {
        res.status(400).json({ success: false, code: 'INVALID_REQUEST_ID' }); return;
      }
      if (!['approve', 'reject', 'revision'].includes(String(body.action))) { res.status(400).json({ success: false, code: 'INVALID_ACTION' }); return; }
      const [row] = await AppDataSource.query('SELECT service_code FROM forum_category_requests WHERE id = $1::uuid AND service_code = ANY($2::text[])', [req.params.requestId, workspace.forumStorageCodes]);
      if (!row) { res.status(404).json({ success: false, code: 'REQUEST_NOT_FOUND' }); return; }
      result = await forumRequestService.review(req.params.requestId, row.service_code, reviewer, { action: body.action as 'approve' | 'reject' | 'revision', reviewComment: trimmed(body.reviewComment) });
    } else { res.status(403).json({ success: false, code: 'COMMUNITY_OPERATOR_REQUIRED' }); return; }
    if ('error' in result) { res.status(result.error.status).json({ success: false, error: result.error.message, code: result.error.code }); return; }
    res.status(req.method === 'POST' ? 201 : 200).json({ success: true, data: result.data });
  }));

  router.post('/:communityKey/boards', apiLimiter, authenticate, asyncHandler(async (req, res) => {
    const user = await currentCommunityUser(req as AuthRequest);
    const board = await AppDataSource.transaction(async (m) => {
      const workspace = await resolveCommunityWorkspace(m, user, req.params.communityKey);
      if (!workspace?.allowed || !workspace.canManage) return null;
      return createCommunityBoard(m, workspace, user!.id!, bodyOf(req));
    }).catch(error => {
      if (error.message === 'INVALID_BOARD_NAME') return 'invalid' as const;
      throw error;
    });
    if (!board) { res.status(403).json({ success: false, code: 'COMMUNITY_OPERATOR_REQUIRED' }); return; }
    if (board === 'invalid') { res.status(400).json({ success: false, code: 'INVALID_BOARD_NAME' }); return; }
    res.status(201).json({ success: true, data: board });
  }));

  router.use('/:communityKey/forum', createServiceForumRouter({
    context: { scope: 'community' },
    resolveContext: async (req, res, next) => {
      try {
        const user = await currentCommunityUser(req as AuthRequest);
        const workspace = await resolveCommunityWorkspace(AppDataSource, user, req.params.communityKey);
        if (!workspace?.allowed) {
          res.status(workspace ? 403 : 404).json({ success: false, code: workspace?.reason ?? 'COMMUNITY_NOT_FOUND' }); return;
        }
        req.forumContext = { communityKey: workspace.communityKey, forumStorageCodes: workspace.forumStorageCodes,
          communityOperator: workspace.canManage, scope: 'community' };
        next();
      } catch (error) { next(error); }
    },
  }));

  router.get(
    '/:communityKey/access',
    optionalAuth,
    asyncHandler(async (req, res) => {
      const user = await currentCommunityUser(req as AuthRequest);
      const communityKey = String(req.params.communityKey ?? '');
      const access = await resolveCommunityWorkspace(AppDataSource, user, communityKey);
      if (!access) {
        res.status(404).json({ success: false, error: 'Community not found', code: 'COMMUNITY_NOT_FOUND' });
        return;
      }
      res.json({ success: true, data: access });
    }),
  );

  return router;
}
