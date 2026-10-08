/**
 * Community Scope — 개체 단위 권한 경계
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §3-3-1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 `community_id` 일치만으로는 안 되는가
 *
 *   승인된 **일반 회원도 같은 `community_id`** 를 갖는다. ID 만 비교하면 회원이
 *   가입 승인 · 게시글 중재 같은 **운영 기능을 통과**한다.
 *   그래서 판정은 세 조건을 모두 본다 — 개체 일치 · `status='active'` ·
 *   (운영자를 요구할 때) `role='operator'`.
 *
 * 분회(`kpa-branch-scope.middleware.ts`)와 같은 형태다. 다른 점은 분회가
 * `branch_memberships` 하나로 소속만 보는 반면, 커뮤니티는 **같은 테이블 안에서
 * 역할까지 갈라야 한다**는 것이다.
 *
 * `community:admin`(서비스 전체 관리자)을 여기서 bypass 시키지 않는다.
 * 전체 관리자는 **개설 신청 승인** 경로에서만 쓰고, 개별 커뮤니티 운영 기능은
 * 개체 역할로만 통과시킨다 — 전체 권한이 모든 커뮤니티의 내부 운영까지 여는 것을 막는다.
 */
import { getNetureMainMembershipStatus } from '../modules/neture/services/neture-main-membership.js';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppDataSource } from '../database/connection.js';
import { Community } from '../entities/Community.js';
import { CommunityMembership } from '../entities/CommunityMembership.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** resolveCommunity 가 확정한 커뮤니티 개체 */
      community?: { id: string; slug: string; name: string; status: string };
    }
  }
}

export type CommunityScopeLevel = 'member' | 'operator';

export const COMMUNITY_NOT_FOUND = 'COMMUNITY_NOT_FOUND';
export const COMMUNITY_MEMBERSHIP_REQUIRED = 'COMMUNITY_MEMBERSHIP_REQUIRED';
export const COMMUNITY_OPERATOR_REQUIRED = 'COMMUNITY_OPERATOR_REQUIRED';
export const COMMUNITY_SERVICE_MEMBERSHIP_REQUIRED = 'COMMUNITY_SERVICE_MEMBERSHIP_REQUIRED';

/** 커뮤니티 진입 자격 서비스 키 (community-lifecycle.service 의 COMMUNITY_SERVICE_KEY 와 같다). */
const COMMUNITY_SERVICE_KEY = 'community';

/**
 * `:communitySlug` 로 개체를 확정한다. 없으면 404.
 * URL 의 slug 를 그대로 신뢰하지 않고 **행으로 확인**하는 것이 요점이다 —
 * 다른 커뮤니티의 slug·ID 를 넘기면 여기서 잡히거나, 아래 scope 에서 걸린다.
 */
export const resolveCommunity: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = (req.params as Record<string, string | undefined>).communitySlug;
    if (!slug) {
      res.status(400).json({ success: false, error: '커뮤니티를 지정해야 합니다.', code: 'COMMUNITY_REQUIRED' });
      return;
    }
    const repo = AppDataSource.getRepository(Community);
    const community = await repo.findOne({ where: { slug: slug.toLowerCase() } });
    if (!community || community.status !== 'active') {
      res.status(404).json({ success: false, error: '커뮤니티를 찾을 수 없습니다.', code: COMMUNITY_NOT_FOUND });
      return;
    }
    req.community = {
      id: community.id,
      slug: community.slug,
      name: community.name,
      status: community.status,
    };
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * 개체 경계. `resolveCommunity` 다음에 쓴다.
 *
 *   level='member'    active 가입자만 (게시글 읽기·작성)
 *   level='operator'  active + role='operator' + 커뮤니티 서비스 가입 active (가입 승인 · 중재)
 *
 * 운영자 수준은 서비스 가입(`service_memberships('community')`)도 본다. 서비스 이용이 정지된
 * 계정이 개체 행만 남아 있다고 심사 권한을 쓰면 안 된다(운영자 지정 경로와 같은 규칙).
 */
export function requireCommunityScope(level: CommunityScopeLevel): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as { user?: { id?: string } }).user;
      if (!user?.id) {
        res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
        return;
      }
      if (!req.community) {
        res.status(500).json({
          success: false,
          error: 'resolveCommunity must run before requireCommunityScope',
          code: 'COMMUNITY_NOT_RESOLVED',
        });
        return;
      }

      if ((await getNetureMainMembershipStatus(AppDataSource, user.id)) !== 'active') {
        res.status(403).json({ success: false, error: '메인 계정의 이메일 확인과 이용 상태를 확인해 주세요.', code: 'NETURE_MEMBERSHIP_REQUIRED' });
        return;
      }
      const membership = await AppDataSource.getRepository(CommunityMembership).findOne({
        where: { communityId: req.community.id, userId: user.id },
      });

      // ① 개체 일치 + ② 승인 상태
      if (!membership || membership.status !== 'active') {
        res.status(403).json({
          success: false,
          error: '이 커뮤니티에 가입 승인된 사용자만 이용할 수 있습니다.',
          code: COMMUNITY_MEMBERSHIP_REQUIRED,
        });
        return;
      }

      // ③ 운영자 요구 시 역할
      if (level === 'operator' && membership.role !== 'operator') {
        res.status(403).json({
          success: false,
          error: '이 커뮤니티의 운영자만 할 수 있습니다.',
          code: COMMUNITY_OPERATOR_REQUIRED,
        });
        return;
      }

      // ④ 운영자 요구 시 서비스 가입 — 정지·탈퇴·미가입 계정은 개체 운영 기능을 쓸 수 없다.
      if (level === 'operator') {
        const sm: Array<{ status: string }> = await AppDataSource.query(
          `SELECT status FROM service_memberships WHERE user_id = $1 AND service_key = $2 LIMIT 1`,
          [user.id, COMMUNITY_SERVICE_KEY],
        );
        if (sm?.[0]?.status !== 'active') {
          res.status(403).json({
            success: false,
            error: '커뮤니티 서비스 이용이 정상(active)인 운영자만 할 수 있습니다.',
            code: COMMUNITY_SERVICE_MEMBERSHIP_REQUIRED,
          });
          return;
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
