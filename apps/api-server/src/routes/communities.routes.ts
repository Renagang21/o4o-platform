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
 *   GET  /requests                             승인 대기 목록        — community:admin
 *   POST /requests/:requestId/approve          개설 승인 (검사 2회차) — community:admin
 *   POST /requests/:requestId/reject           개설 거절             — community:admin
 *   POST /:communitySlug/join                  가입 신청 (승인형 하나)
 *   GET  /:communitySlug/memberships           가입 신청·회원 목록    — 그 커뮤니티 operator
 *   POST /:communitySlug/memberships/:membershipId/approve  가입 승인 — 그 커뮤니티 operator
 *   POST /:communitySlug/memberships/:membershipId/reject   가입 거절 — 그 커뮤니티 operator
 *
 * 두 심사 주체가 **다른 축**이라는 점이 요점이다:
 *   개설 심사 = 아직 어떤 커뮤니티에도 속하지 않은 요청 -> 서비스 전체 역할 `community:admin`
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
import { freshenUserContext } from '../services/auth/auth-context.helper.js';
import {
  listCommunitiesForUser,
  resolveCommunityAccess,
  type CommunityAccessUser,
} from '../utils/community-access.resolver.js';

async function currentCommunityUser(req: AuthRequest): Promise<CommunityAccessUser | null> {
  const user = req.user;
  if (!user?.id) return null;
  try {
    const fresh = await freshenUserContext(user.id);
    return { id: user.id, roles: fresh.roles, memberships: fresh.memberships };
  } catch {
    // DB 갱신 실패 시 JWT payload 로 판정 (기존 guard 와 동일 소스)
    return { id: user.id, roles: user.roles ?? [], memberships: (user as any).memberships ?? [] };
  }
}

/** lifecycle 오류를 응답으로 옮긴다 — 라우트마다 분기를 복제하지 않는다. */
function sendLifecycleError(res: Response, error: unknown): boolean {
  if (!(error instanceof CommunityLifecycleError)) return false;
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

const bodyOf = (req: { body?: unknown }): Record<string, unknown> =>
  (req.body ?? {}) as Record<string, unknown>;
const trimmed = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

export function createCommunitiesRoutes(
  optionalAuth: RequestHandler,
  authenticate: RequestHandler,
): Router {
  const router = Router();

  // 개체 운영자 경계: slug -> 행 확인 -> active 가입 -> role='operator'
  const operatorOnly: RequestHandler[] = [apiLimiter, authenticate, resolveCommunity, requireCommunityScope('operator')];
  // 서비스 전체 심사 경계
  const serviceAdminOnly: RequestHandler[] = [apiLimiter, authenticate, requireCommunityServiceScope('community:admin')];

  router.get(
    '/',
    optionalAuth,
    asyncHandler(async (req, res) => {
      const user = await currentCommunityUser(req as AuthRequest);
      res.json({ success: true, data: { communities: listCommunitiesForUser(user) } });
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
    ...serviceAdminOnly,
    asyncHandler(async (_req, res) => {
      res.json({ success: true, data: { requests: await lifecycle().listPendingCreationRequests() } });
    }),
  );

  router.post(
    '/requests/:requestId/approve',
    ...serviceAdminOnly,
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
    ...serviceAdminOnly,
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

  router.get(
    '/:communitySlug/memberships',
    ...operatorOnly,
    asyncHandler(async (req, res) => {
      const status = req.query.status;
      res.json({
        success: true,
        data: {
          memberships: await lifecycle().listMemberships({
            communityId: req.community!.id,
            status: typeof status === 'string' ? (status as 'pending' | 'active' | 'rejected' | 'withdrawn') : undefined,
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

  router.get(
    '/:communityKey/access',
    optionalAuth,
    asyncHandler(async (req, res) => {
      const user = await currentCommunityUser(req as AuthRequest);
      const access = resolveCommunityAccess(user, String(req.params.communityKey ?? ''));
      if (access.reason === 'UNKNOWN_COMMUNITY') {
        res.status(404).json({ success: false, error: 'Community not found', code: 'COMMUNITY_NOT_FOUND' });
        return;
      }
      res.json({ success: true, data: access });
    }),
  );

  return router;
}
