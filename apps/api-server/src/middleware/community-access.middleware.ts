/**
 * Community 게시글 경계 — 참여 자격 AND 가입 승인
 *
 * WO-O4O-COMMUNITY-WORKSPACE-CATALOG-AND-ACCESS-ALIGNMENT-V1 (참여 자격)
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §10 V7 (가입 승인)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 여기 있는 이유
 *   종전에는 이 게이트가 `routes/forum/service-forum.routes.ts` 안에 있었고
 *   `routes/kpa/kpa.routes.ts` 가 그 라우터 모듈에서 가져다 썼다. 그래서 게이트 하나를
 *   확인하려면 forum controller 전체(그리고 그 entity 그래프)를 함께 적재해야 했다.
 *   경계 판정은 middleware 계층에 두고 라우트는 소비만 한다.
 */
import type { RequestHandler } from 'express';
import { AppDataSource } from '../database/connection.js';
import { resolveCommunityWorkspace } from '../services/community/community-workspace.service.js';

/**
 * 판정은 두 조건을 **모두** 본다.
 *
 * ① 참여 자격 — community catalog 의 participation policy. 서비스별 분기가 없다:
 *      pharmacy     = independent approved pharmacist community
 *      cosmetics    = k-cosmetics active membership
 *      o4o-general  = authenticated O4O user (Neture membership 불요)
 *    자격이 없으면 애초에 가입 대상이 아니다.
 *
 * ② 가입 승인 — 그 커뮤니티의 `community_memberships(status='active')`.
 *    종전에는 ① 만으로 게시글을 읽고 썼다. 이제 모든 커뮤니티가 **가입 승인형 하나**이므로
 *    서비스 membership 이 있어도 승인 없이는 통과하지 않는다. 카탈로그 폴백으로 남은
 *    커뮤니티(`pharmacy` · `cosmetics` · `o4o-general`)도 **예외가 아니다** — 폴백은
 *    목록·상세(메타데이터)만 커버하며 게시글 권한을 대신 판정하지 않는다.
 *
 * 운영자 권한 · closed forum 멤버십은 이 게이트 뒤의 기존 계약 그대로다.
 */
export function requireCommunityAccess(communityKey: string): RequestHandler {
  return async (req, res, next) => {
    const user = (req as any).user;
    if (!user?.id) {
      res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
      return;
    }

    try {
      const workspace = await resolveCommunityWorkspace(AppDataSource, user, communityKey);
      if (!workspace?.allowed) {
        res.status(workspace ? 403 : 404).json({
          success: false,
          error: '이 커뮤니티의 가입 상태를 확인해 주세요.',
          code: workspace?.reason ?? 'COMMUNITY_NOT_FOUND',
        });
        return;
      }
    } catch (error) {
      next(error);
      return;
    }

    next();
  };
}

/**
 * 그 커뮤니티의 active 가입 여부.
 *
 * `communities.slug` 가 catalog 의 `key` 와 같은 값이다(폴백 커뮤니티를 DB 로 승격할 때
 * 같은 slug 를 쓴다). 행이 아직 없으면 **승인된 사람이 없다**는 뜻이므로 false 다 —
 * 없는 것을 통과로 바꾸지 않는다(fail-closed).
 */
export async function hasApprovedCommunityMembership(communityKey: string, userId: string): Promise<boolean> {
  const rows: Array<{ ok: number }> = await AppDataSource.query(
    `SELECT 1 AS ok
       FROM community_memberships cm
       JOIN communities c ON c.id = cm.community_id
      WHERE c.slug = $1 AND c.status = 'active'
        AND cm.user_id = $2 AND cm.status = 'active'
        AND EXISTS (SELECT 1 FROM users u WHERE u.id = $2 AND u."isEmailVerified" = true AND u."isActive" = true AND u.status IN ('active','approved'))
        AND NOT EXISTS (SELECT 1 FROM service_memberships main WHERE main.user_id = $2 AND main.service_key = 'neture' AND main.status IN ('suspended','withdrawn'))
      LIMIT 1`,
    [communityKey, userId],
  );
  return rows.length > 0;
}
