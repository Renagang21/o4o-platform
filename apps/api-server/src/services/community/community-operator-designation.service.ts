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
 *   - 메인과 커뮤니티 서비스 이용이 가능한 마지막 유효 admin은 내리지 않는다.
 *     같은 커뮤니티의 운영자 행을 `FOR UPDATE` 로 잠그고 판정·UPDATE 를 한 트랜잭션에서 한다.
 */
import { hasEligibleCommunityMembership, protectLastCommunityAdmin, recordCommunityMembershipChange } from './community-membership-mutations.js';
import { COMMUNITY_SERVICE_KEY } from './community-lifecycle.service.js';
import { getNetureMainMembershipStatus, NETURE_MAIN_MEMBERSHIP_MESSAGES } from '../../modules/neture/services/neture-main-membership.js';
import {
  demoAccountService,
  DEMO_ACCOUNT_FORBIDDEN_CODE,
  DEMO_ACCOUNT_FORBIDDEN_MESSAGE,
} from '../auth/demo-account.service.js';

export type CommunityMemberRole = 'admin' | 'operator' | 'member';
export type CommunityDesignationEligibility = {
  eligible: boolean;
  code: 'MEMBERSHIP_NOT_ACTIVE' | 'DEMO_ACCOUNT_FORBIDDEN' | 'MAIN_MEMBERSHIP_NOT_ACTIVE' | 'SERVICE_MEMBERSHIP_NOT_ACTIVE' | null;
  message: string | null;
};

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
              COUNT(cm.id) FILTER (WHERE cm.status = 'active' AND cm.role IN ('admin', 'operator'))::int AS operator_count,
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

  private async requireCommunity(m: CommunityOperatorTx, communityId: string, lock = false): Promise<{ id: string; name: string }> {
    if (!UUID.test(communityId)) throw notFound();
    const rows = await m.query(`SELECT id, name FROM communities WHERE id = $1${lock ? ' FOR UPDATE' : ''}`, [communityId]);
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
      membershipStatus: string;
      designationEligibility: CommunityDesignationEligibility;
    }>;
  }> {
    const community = await this.requireCommunity(this.db, communityId);
    const rows = await this.db.query(
      `SELECT cm.id AS membership_id, cm.user_id, cm.role, cm.status, u.name AS user_name, u.email AS user_email,
              sm.status AS service_status
         FROM community_memberships cm
         JOIN users u ON u.id = cm.user_id
         LEFT JOIN service_memberships sm ON sm.user_id = cm.user_id AND sm.service_key = $2
        WHERE cm.community_id = $1 AND cm.status IN ('active', 'suspended')
        ORDER BY (cm.role IN ('admin', 'operator')) DESC, u.name ASC NULLS LAST`,
      [communityId, COMMUNITY_SERVICE_KEY],
    );
    return {
      community,
      members: await Promise.all(rows.map(async (r: any) => ({
        membershipId: r.membership_id,
        userId: r.user_id,
        name: r.user_name,
        email: r.user_email,
        role: ['admin', 'operator'].includes(r.role) ? r.role : 'member',
        serviceMembershipStatus: r.service_status,
        membershipStatus: r.status,
        designationEligibility: await this.designationEligibility(r),
      }))),
    };
  }

  /** 조회 안내만 제공한다. 실제 지정은 setRole의 트랜잭션에서 다시 판정한다. */
  private async designationEligibility(row: { user_id: string; status: string; service_status: string | null }): Promise<CommunityDesignationEligibility> {
    if (row.status !== 'active') return { eligible: false, code: 'MEMBERSHIP_NOT_ACTIVE', message: '개별 커뮤니티 가입이 활성 상태여야 지정할 수 있습니다.' };
    if (await demoAccountService.isDemoAccount(row.user_id, this.db)) return { eligible: false, code: 'DEMO_ACCOUNT_FORBIDDEN', message: DEMO_ACCOUNT_FORBIDDEN_MESSAGE };
    const mainStatus = await getNetureMainMembershipStatus(this.db, row.user_id);
    if (mainStatus !== 'active') return { eligible: false, code: 'MAIN_MEMBERSHIP_NOT_ACTIVE', message: NETURE_MAIN_MEMBERSHIP_MESSAGES[mainStatus] };
    if (row.service_status !== 'active') return { eligible: false, code: 'SERVICE_MEMBERSHIP_NOT_ACTIVE', message: '커뮤니티 서비스 가입이 활성 상태여야 지정할 수 있습니다.' };
    return { eligible: true, code: null, message: null };
  }

  /** 운영자 지정(role IN ('admin','operator')) · 해제(role='member'). */
  async setRole(input: {
    communityId: string;
    membershipId: string;
    role: CommunityMemberRole;
    actorUserId: string;
    reason: string;
  }): Promise<{ membershipId: string; role: CommunityMemberRole; changed: boolean }> {
    if (!['admin', 'operator', 'member'].includes(input.role)) {
      throw new CommunityOperatorDesignationError(400, 'INVALID_ROLE', "role 은 'admin', 'operator', 'member' 중 하나여야 합니다.");
    }
    if (!input.reason?.trim() || input.reason.trim().length > 1000) throw new CommunityOperatorDesignationError(400, 'REASON_REQUIRED', '역할 변경 사유를 1~1000자로 입력하세요.');
    if (!UUID.test(input.membershipId)) {
      throw new CommunityOperatorDesignationError(404, 'MEMBERSHIP_NOT_FOUND', '가입 행을 찾을 수 없습니다.');
    }
    return this.db.transaction(async (m) => {
      await this.requireCommunity(m, input.communityId, true);
      // 그 커뮤니티의 운영자 행 + 대상 행을 잠근다 — 동시 해제로 운영자 0 이 되는 것을 막는다.
      const locked: Array<{ id: string; user_id: string; role: string; status: string }> = await m.query(
        `SELECT id, user_id, role, status FROM community_memberships
          WHERE community_id = $1 AND (id = $2 OR (role = 'admin' AND status = 'active'))
          ORDER BY id FOR UPDATE`,
        [input.communityId, input.membershipId],
      );
      const target = locked.find((r) => r.id === input.membershipId);
      if (!target) {
        throw new CommunityOperatorDesignationError(404, 'MEMBERSHIP_NOT_FOUND', '가입 행을 찾을 수 없습니다.');
      }
      if (target.status !== 'active' && input.role !== 'member') {
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

      if (input.role !== 'member' && !await hasEligibleCommunityMembership(m, target.user_id)) {
        throw new CommunityOperatorDesignationError(409, 'SERVICE_MEMBERSHIP_NOT_ACTIVE', '메인 계정과 커뮤니티 서비스 가입이 활성 상태인 회원만 지정할 수 있습니다.');
      }
      if (target.role === 'admin' && target.status === 'active' && input.role !== 'admin') {
        await protectLastCommunityAdmin(m, input.communityId, target.id);
      }
      await recordCommunityMembershipChange(m, {
        ...input, reason: input.reason.trim(), action: 'role', beforeRole: target.role, afterRole: input.role,
        beforeStatus: target.status, afterStatus: target.status,
      });

      await m.query(
        `UPDATE community_memberships SET role = $1, updated_at = NOW()
          WHERE id = $2 AND community_id = $3`,
        [input.role, target.id, input.communityId],
      );
      return { membershipId: target.id, role: input.role, changed: true };
    });
  }
}
