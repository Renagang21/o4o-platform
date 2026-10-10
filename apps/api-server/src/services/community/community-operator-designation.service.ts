/**
 * 개별 커뮤니티 운영자 지정·해제 — WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 (권한 경계 정리)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 원칙: 중앙 관리자는 서비스 Admin/Operator 를 지정한다. 개별 커뮤니티 운영자는
 * `community_memberships.role` 의 **개체 역할**이고, 커뮤니티 서비스 Admin 이 각 커뮤니티의
 * **승인된(active) 회원 중에서** 지정·해제한다. 서비스 전역 역할은 만들지 않는다(role_assignments 무변경).
 *
 * 고정하는 것
 *   - 대상은 그 커뮤니티의 active 가입 행뿐이다(pending · rejected · 다른 커뮤니티 행 → 409 / 404)
 *   - 서비스 membership(`community`)이 active 가 아닌 회원은 운영자로 올리지 않는다 — 진입 자격이 없으면
 *     운영자여도 화면에 들어갈 수 없다(V8). 여기서 되살리지 않는다.
 *   - 메인과 커뮤니티 서비스 이용이 가능한 마지막 운영자는 내리지 않는다.
 *     같은 커뮤니티의 운영자 행을 `FOR UPDATE` 로 잠그고 판정·UPDATE 를 한 트랜잭션에서 한다.
 */
import { getNetureMainMembershipStatus } from '../../modules/neture/services/neture-main-membership.js';
import { COMMUNITY_SERVICE_KEY } from './community-lifecycle.service.js';
import {
  demoAccountService,
  DEMO_ACCOUNT_FORBIDDEN_CODE,
  DEMO_ACCOUNT_FORBIDDEN_MESSAGE,
} from '../auth/demo-account.service.js';

export type CommunityMemberRole = 'operator' | 'member';

export interface CommunityOperatorTx {
  query: (sql: string, params?: unknown[]) => Promise<any>;
}
export interface CommunityOperatorRunner extends CommunityOperatorTx {
  transaction<T>(run: (m: CommunityOperatorTx) => Promise<T>): Promise<T>;
}

export class CommunityOperatorDesignationError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'CommunityOperatorDesignationError';
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const notFound = () => new CommunityOperatorDesignationError(404, 'COMMUNITY_NOT_FOUND', '커뮤니티를 찾을 수 없습니다.');

export class CommunityOperatorDesignationService {
  constructor(private readonly db: CommunityOperatorRunner) {}

  /** 커뮤니티 목록 + 운영자 · active 회원 수. */
  async listCommunities(): Promise<
    Array<{ id: string; slug: string; name: string; status: string; operatorCount: number; memberCount: number }>
  > {
    const rows = await this.db.query(
      `SELECT c.id, c.slug, c.name, c.status,
              COUNT(cm.id) FILTER (WHERE cm.status = 'active' AND cm.role = 'operator')::int AS operator_count,
              COUNT(cm.id) FILTER (WHERE cm.status = 'active')::int AS member_count
         FROM communities c
         LEFT JOIN community_memberships cm ON cm.community_id = c.id
        GROUP BY c.id
        ORDER BY c.name ASC`,
    );
    return rows.map((r: any) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      status: r.status,
      operatorCount: Number(r.operator_count ?? 0),
      memberCount: Number(r.member_count ?? 0),
    }));
  }

  private async requireCommunity(m: CommunityOperatorTx, communityId: string): Promise<{ id: string; name: string }> {
    if (!UUID.test(communityId)) throw notFound();
    const rows = await m.query(`SELECT id, name FROM communities WHERE id = $1`, [communityId]);
    if (!rows?.length) throw notFound();
    return rows[0];
  }

  /** 그 커뮤니티의 승인된(active) 회원 — 지정 후보와 현재 운영자. */
  async listMembers(communityId: string): Promise<{
    community: { id: string; name: string };
    members: Array<{
      membershipId: string;
      userId: string;
      name: string | null;
      email: string | null;
      role: CommunityMemberRole;
      serviceMembershipStatus: string | null;
    }>;
  }> {
    const community = await this.requireCommunity(this.db, communityId);
    const rows = await this.db.query(
      `SELECT cm.id AS membership_id, cm.user_id, cm.role, u.name AS user_name, u.email AS user_email,
              sm.status AS service_status
         FROM community_memberships cm
         JOIN users u ON u.id = cm.user_id
         LEFT JOIN service_memberships sm ON sm.user_id = cm.user_id AND sm.service_key = $2
        WHERE cm.community_id = $1 AND cm.status = 'active'
        ORDER BY (cm.role = 'operator') DESC, u.name ASC NULLS LAST`,
      [communityId, COMMUNITY_SERVICE_KEY],
    );
    return {
      community,
      members: rows.map((r: any) => ({
        membershipId: r.membership_id,
        userId: r.user_id,
        name: r.user_name,
        email: r.user_email,
        role: r.role === 'operator' ? 'operator' : 'member',
        serviceMembershipStatus: r.service_status,
      })),
    };
  }

  /** 운영자 지정(role='operator') · 해제(role='member'). */
  async setRole(input: {
    communityId: string;
    membershipId: string;
    role: CommunityMemberRole;
  }): Promise<{ membershipId: string; role: CommunityMemberRole; changed: boolean }> {
    if (input.role !== 'operator' && input.role !== 'member') {
      throw new CommunityOperatorDesignationError(400, 'INVALID_ROLE', "role 은 'operator' 또는 'member' 여야 합니다.");
    }
    if (!UUID.test(input.membershipId)) {
      throw new CommunityOperatorDesignationError(404, 'MEMBERSHIP_NOT_FOUND', '가입 행을 찾을 수 없습니다.');
    }
    return this.db.transaction(async (m) => {
      await this.requireCommunity(m, input.communityId);
      // 그 커뮤니티의 운영자 행 + 대상 행을 잠근다 — 동시 해제로 운영자 0 이 되는 것을 막는다.
      const locked: Array<{ id: string; user_id: string; role: string; status: string }> = await m.query(
        `SELECT id, user_id, role, status FROM community_memberships
          WHERE community_id = $1 AND (id = $2 OR (role = 'operator' AND status = 'active'))
          ORDER BY id FOR UPDATE`,
        [input.communityId, input.membershipId],
      );
      const target = locked.find((r) => r.id === input.membershipId);
      if (!target) {
        throw new CommunityOperatorDesignationError(404, 'MEMBERSHIP_NOT_FOUND', '가입 행을 찾을 수 없습니다.');
      }
      if (target.status !== 'active') {
        throw new CommunityOperatorDesignationError(
          409,
          'MEMBERSHIP_NOT_ACTIVE',
          '가입이 승인된(active) 회원만 운영자로 지정·해제할 수 있습니다.',
        );
      }
      if (target.role === input.role) return { membershipId: target.id, role: input.role, changed: false };
      // Demo 계정의 개체 role 은 바꾸지 않는다 — UPDATE 전에 거절
      // (WO-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1 · 판정 정본 demo_accounts.user_id).
      if (await demoAccountService.isDemoAccount(target.user_id, m)) {
        throw new CommunityOperatorDesignationError(403, DEMO_ACCOUNT_FORBIDDEN_CODE, DEMO_ACCOUNT_FORBIDDEN_MESSAGE);
      }

      // 개체 역할만 남은 정지/탈퇴 운영자는 마지막 운영자 보호의 대체자가 아니다.
      const candidates = input.role === 'operator'
        ? [target]
        : locked.filter((r) => r.id !== target.id && r.role === 'operator' && r.status === 'active');
      const memberships: Array<{ user_id: string; status: string }> = await m.query(
        `SELECT user_id, status FROM service_memberships
          WHERE user_id = ANY($1::uuid[]) AND service_key = $2
          ORDER BY user_id FOR UPDATE`,
        [candidates.map((r) => r.user_id), COMMUNITY_SERVICE_KEY],
      );
      let eligible = false;
      for (const candidate of candidates) {
        if (!memberships.some((row) => row.user_id === candidate.user_id && row.status === 'active')) continue;
        if (await getNetureMainMembershipStatus(m, candidate.user_id) === 'active') {
          eligible = true;
          break;
        }
      }
      if (!eligible) {
        throw new CommunityOperatorDesignationError(
          409,
          input.role === 'operator' ? 'SERVICE_MEMBERSHIP_NOT_ACTIVE' : 'LAST_OPERATOR_PROTECTED',
          input.role === 'operator'
            ? '메인 계정과 커뮤니티 서비스 가입이 활성 상태인 회원만 운영자로 지정할 수 있습니다.'
            : '운영 가능한 마지막 커뮤니티 운영자는 해제할 수 없습니다. 다른 운영자를 먼저 지정하세요.',
        );
      }

      await m.query(
        `UPDATE community_memberships SET role = $1, updated_at = NOW()
          WHERE id = $2 AND community_id = $3 AND status = 'active'`,
        [input.role, target.id, input.communityId],
      );
      return { membershipId: target.id, role: input.role, changed: true };
    });
  }
}
