/**
 * Communities — Community Catalog read contract (service-neutral)
 *
 * WO-O4O-COMMUNITY-WORKSPACE-CATALOG-AND-ACCESS-ALIGNMENT-V1
 *
 *   GET /api/v1/communities              — active Community 목록 + 현재 사용자의 참여 가능 여부
 *   GET /api/v1/communities/:communityKey/access — 한 Community 의 참여 판정
 *
 * 계약:
 *   - **조회 전용.** write 0. 새 membership · role · enrollment 를 만들지 않는다 (WO §11).
 *   - 판정은 `resolveCommunityAccess`(community catalog policy) 한 곳 — 프런트가
 *     `if (hasKpaMembership)` 를 반복 구현하지 않는다 (WO §18).
 *   - 사용자 id 는 세션에서만 온다. 참여 자격은 DB 의 현재 service_memberships 로 판정한다
 *     (JWT payload 가 오래됐을 수 있으므로 `freshenUserContext` 로 갱신 — 읽기 전용).
 *   - 비로그인도 200 으로 목록을 돌려주되 canParticipate=false · reason=AUTH_REQUIRED (공개 read 정책과 분리).
 */

import { Router } from 'express';
import { asyncHandler } from '../middleware/error-handler.js';
import type { AuthRequest } from '../types/auth.js';
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

export function createCommunitiesRoutes(optionalAuth: import('express').RequestHandler): Router {
  const router = Router();

  router.get(
    '/',
    optionalAuth,
    asyncHandler(async (req, res) => {
      const user = await currentCommunityUser(req as AuthRequest);
      res.json({ success: true, data: { communities: listCommunitiesForUser(user) } });
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
