/**
 * 세미프랜차이즈 = 데이터 행 (DESIGN §1 R3 · R4 · §3-2)
 *
 * - 약국 조직 단위 가입(신청 · 승인 · 정지 · 종료). 내 매장(약국) 승인이 세미프랜차이즈 가입을 자동 승인하지 않는다.
 * - 신청 · 승인(재활성화 포함) 시점에 **현재** Neture 메인 가입 active 를 직접 확인한다 — 내 매장 승인을 거쳤다는
 *   간접 충족에 기대지 않는다(이후 Neture 가입 상태가 바뀔 수 있다). 정지 연쇄 정책은 별도.
 * - 담당 운영자 판정 = (라우트 guard) neture:operator role ∧ (여기) semi_franchise_operators 활성 행.
 * - 세미프랜차이즈를 추가해도 코드 분기를 늘리지 않는다(행 + 운영 조직 1개).
 */
import type { DataSource } from 'typeorm';
import {
  NeturePharmacyError,
  canReapply,
  nextMembershipStatus,
  type MembershipAction,
  type MembershipStatus,
  rowsOf,
} from '../constants.js';
import { assertNetureMainMembershipActive } from '../../neture/services/neture-main-membership.js';

export interface SemiFranchiseRow {
  id: string;
  key: string;
  name: string;
  organization_id: string;
  status: 'active' | 'closed';
  payment_receiver_key: string | null;
  community_key: string | null;
}

const SF_COLUMNS = `sf.id, sf.key, sf.name, sf.organization_id, sf.status, sf.payment_receiver_key, sf.community_key`;
const KEY_RE = /^[a-z0-9][a-z0-9-]{1,62}$/;

export class SemiFranchiseService {
  constructor(private readonly dataSource: DataSource) {}

  async getByKey(key: string): Promise<SemiFranchiseRow | null> {
    const rows = await this.dataSource.query(`SELECT ${SF_COLUMNS} FROM semi_franchises sf WHERE sf.key = $1`, [key]);
    return rows[0] ?? null;
  }

  private async requireActive(key: string): Promise<SemiFranchiseRow> {
    const sf = await this.getByKey(key);
    if (!sf || sf.status !== 'active') {
      throw new NeturePharmacyError(404, 'SEMI_FRANCHISE_NOT_FOUND', '세미프랜차이즈를 찾을 수 없습니다.');
    }
    return sf;
  }

  // ─── 약국 ──────────────────────────────────────────────────────────────

  /** 운영 중인 세미프랜차이즈 목록 + 이 약국의 가입 상태 */
  async listForPharmacy(organizationId: string) {
    return this.dataSource.query(
      `SELECT sf.key, sf.name, sf.community_key AS "communityKey",
              sfm.id AS "membershipId", sfm.status AS "membershipStatus", sfm.reason, sfm.applied_at AS "appliedAt",
              sfm.decided_at AS "decidedAt"
         FROM semi_franchises sf
         LEFT JOIN semi_franchise_memberships sfm
           ON sfm.semi_franchise_id = sf.id AND sfm.organization_id = $1
        WHERE sf.status = 'active'
        ORDER BY (sf.key = 'pharmacy') DESC, sf.name, sf.key`,
      [organizationId],
    );
  }

  async apply(organizationId: string, userId: string, key: string) {
    const sf = await this.requireActive(key);
    return this.dataSource.transaction(async (m) => {
      await assertNetureMainMembershipActive(m, userId);
      const [existing] = await m.query(
        `SELECT id, status FROM semi_franchise_memberships
          WHERE semi_franchise_id = $1 AND organization_id = $2 FOR UPDATE`,
        [sf.id, organizationId],
      );
      if (existing) {
        if (!canReapply(existing.status)) {
          throw new NeturePharmacyError(409, 'ALREADY_APPLIED', '이미 신청했거나 가입된 세미프랜차이즈입니다.');
        }
        const [row] = rowsOf(await m.query(
          `UPDATE semi_franchise_memberships
              SET status = 'pending', applied_by = $2, applied_at = NOW(),
                  decided_by = NULL, decided_at = NULL, reason = NULL, updated_at = NOW()
            WHERE id = $1 RETURNING id, status`,
          [existing.id, userId],
        ));
        return row;
      }
      const [row] = await m.query(
        `INSERT INTO semi_franchise_memberships (semi_franchise_id, organization_id, status, applied_by)
         VALUES ($1, $2, 'pending', $3) RETURNING id, status`,
        [sf.id, organizationId, userId],
      );
      return row;
    });
  }

  /** 약국 본인 탈퇴 · 신청 취소 → terminated */
  async withdraw(organizationId: string, key: string) {
    const sf = await this.requireActive(key);
    const rows = rowsOf(await this.dataSource.query(
      `UPDATE semi_franchise_memberships
          SET status = 'terminated', reason = '약국 탈퇴', decided_at = NOW(), decided_by = NULL, updated_at = NOW()
        WHERE semi_franchise_id = $1 AND organization_id = $2 AND status IN ('pending','active','suspended')
      RETURNING id, status`,
      [sf.id, organizationId],
    ));
    if (!rows[0]) throw new NeturePharmacyError(409, 'NOT_A_MEMBER', '탈퇴할 가입이 없습니다.');
    return rows[0];
  }

  // ─── 담당 운영자 ────────────────────────────────────────────────────────

  async isOperatorOf(userId: string, semiFranchiseId: string): Promise<boolean> {
    const rows = await this.dataSource.query(
      `SELECT 1 FROM semi_franchise_operators
        WHERE semi_franchise_id = $1 AND user_id = $2 AND revoked_at IS NULL LIMIT 1`,
      [semiFranchiseId, userId],
    );
    return rows.length > 0;
  }

  /** 담당이 아니면 403. 반환한 세미프랜차이즈 범위 안의 행만 처리한다. */
  async requireOperatorOf(userId: string, key: string): Promise<SemiFranchiseRow> {
    const sf = await this.getByKey(key);
    if (!sf) throw new NeturePharmacyError(404, 'SEMI_FRANCHISE_NOT_FOUND', '세미프랜차이즈를 찾을 수 없습니다.');
    if (!(await this.isOperatorOf(userId, sf.id))) {
      throw new NeturePharmacyError(403, 'NOT_SEMI_FRANCHISE_OPERATOR', '담당 세미프랜차이즈가 아닙니다.');
    }
    return sf;
  }

  async listAssigned(userId: string) {
    return this.dataSource.query(
      `SELECT ${SF_COLUMNS}
         FROM semi_franchises sf
         JOIN semi_franchise_operators op ON op.semi_franchise_id = sf.id AND op.user_id = $1 AND op.revoked_at IS NULL
        ORDER BY sf.name, sf.key`,
      [userId],
    );
  }

  /** 가입 신청 목록 — 운영자가 약국 자격을 독립 확인할 수 있게 내 매장(약국) 신청 원장 정보를 함께 준다. */
  async listMemberships(sf: SemiFranchiseRow, status?: string) {
    const s = status && status !== 'all' ? status : null;
    return this.dataSource.query(
      `SELECT sfm.id, sfm.status, sfm.applied_at AS "appliedAt", sfm.decided_at AS "decidedAt", sfm.reason,
              o.id AS "organizationId", o.name AS "organizationName", o.address AS "organizationAddress",
              npm.status AS "basicMembershipStatus", npm.business_number AS "businessNumber",
              npm.pharmacist_license_number AS "pharmacistLicenseNumber"
         FROM semi_franchise_memberships sfm
         JOIN organizations o ON o.id = sfm.organization_id
         LEFT JOIN neture_pharmacy_memberships npm ON npm.organization_id = sfm.organization_id
        WHERE sfm.semi_franchise_id = $1 AND ($2::text IS NULL OR sfm.status = $2)
        ORDER BY sfm.applied_at DESC, sfm.id`,
      [sf.id, s],
    );
  }

  async decideMembership(
    sf: SemiFranchiseRow,
    operatorId: string,
    membershipId: string,
    action: MembershipAction,
    reason?: string | null,
  ): Promise<{ id: string; status: MembershipStatus }> {
    return this.dataSource.transaction(async (m) => {
      const [current] = await m.query(
        `SELECT id, status FROM semi_franchise_memberships WHERE id = $1 AND semi_franchise_id = $2 FOR UPDATE`,
        [membershipId, sf.id],
      );
      // 다른 세미프랜차이즈의 신청은 존재 자체를 드러내지 않는다.
      if (!current) throw new NeturePharmacyError(404, 'MEMBERSHIP_NOT_FOUND', '가입 신청을 찾을 수 없습니다.');
      const next = nextMembershipStatus(current.status, action);
      if (!next) {
        throw new NeturePharmacyError(409, 'INVALID_TRANSITION', `현재 상태(${current.status})에서 처리할 수 없습니다.`);
      }
      if (next === 'active') {
        // 세미프랜차이즈 가입은 내 매장(약국) 승인이 살아 있는 약국에만 승인한다.
        const [basic] = await m.query(
          `SELECT npm.applicant_user_id FROM semi_franchise_memberships sfm
             JOIN neture_pharmacy_memberships npm ON npm.organization_id = sfm.organization_id AND npm.status = 'active'
            WHERE sfm.id = $1`,
          [membershipId],
        );
        if (!basic) {
          throw new NeturePharmacyError(409, 'BASIC_MEMBERSHIP_NOT_ACTIVE', '내 매장(약국) 승인이 된 약국이 아닙니다.');
        }
        // 약국 신청자의 현재 Neture 메인 가입 상태도 직접 확인한다.
        await assertNetureMainMembershipActive(m, basic.applicant_user_id, 'applicant');
      }
      const [row] = rowsOf(await m.query(
        `UPDATE semi_franchise_memberships
            SET status = $2, decided_by = $3, decided_at = NOW(), reason = $4, updated_at = NOW()
          WHERE id = $1 RETURNING id, status`,
        [membershipId, next, operatorId, reason?.trim()?.slice(0, 1000) || null],
      ));
      return row;
    });
  }

  // ─── Neture 관리자 ──────────────────────────────────────────────────────

  async listAll() {
    return this.dataSource.query(
      `SELECT ${SF_COLUMNS},
              (SELECT count(*)::int FROM semi_franchise_memberships x WHERE x.semi_franchise_id = sf.id AND x.status = 'active') AS "activeMemberCount",
              COALESCE((SELECT json_agg(json_build_object('userId', op.user_id, 'assignedAt', op.assigned_at) ORDER BY op.assigned_at)
                          FROM semi_franchise_operators op WHERE op.semi_franchise_id = sf.id AND op.revoked_at IS NULL), '[]'::json) AS operators
         FROM semi_franchises sf ORDER BY (sf.key = 'pharmacy') DESC, sf.name`,
    );
  }

  async create(input: { key: string; name: string; communityKey?: string | null }): Promise<SemiFranchiseRow> {
    const key = typeof input.key === 'string' ? input.key.trim().toLowerCase() : '';
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!KEY_RE.test(key)) throw new NeturePharmacyError(400, 'INVALID_KEY', 'key 는 영문 소문자 · 숫자 · - 2~63자입니다.');
    if (!name || name.length > 255) throw new NeturePharmacyError(400, 'INVALID_NAME', '이름을 입력해 주세요.');
    return this.dataSource.transaction(async (m) => {
      const [dup] = await m.query(`SELECT 1 FROM semi_franchises WHERE key = $1`, [key]);
      if (dup) throw new NeturePharmacyError(409, 'KEY_IN_USE', '이미 있는 key 입니다.');
      // 운영 조직 — 이 세미프랜차이즈 이벤트 원장(OPL)의 소유 조직.
      const [org] = await m.query(
        `INSERT INTO organizations (name, code, type, "isActive") VALUES ($1, $2, 'semi_franchise', true) RETURNING id`,
        [`${name} 세미프랜차이즈 운영`, `semi-franchise-${key}`],
      );
      const [row] = await m.query(
        `INSERT INTO semi_franchises (key, name, organization_id, community_key)
         VALUES ($1, $2, $3, $4)
         RETURNING id, key, name, organization_id, status, payment_receiver_key, community_key`,
        [key, name, org.id, input.communityKey?.trim() || null],
      );
      return row;
    });
  }

  /**
   * 이름 · 상태 · 커뮤니티 연결 · 결제 수취 주체 키 변경.
   * 수취 주체 키는 사업 결정(D1)이 내려진 뒤 관리자가 명시적으로 넣는다 — 코드가 운영자를 수취 주체로 간주하지 않는다.
   */
  async update(
    key: string,
    patch: { name?: string; status?: 'active' | 'closed'; communityKey?: string | null; paymentReceiverKey?: string | null },
  ): Promise<SemiFranchiseRow> {
    const sf = await this.getByKey(key);
    if (!sf) throw new NeturePharmacyError(404, 'SEMI_FRANCHISE_NOT_FOUND', '세미프랜차이즈를 찾을 수 없습니다.');
    if (patch.status && patch.status !== 'active' && patch.status !== 'closed') {
      throw new NeturePharmacyError(400, 'INVALID_STATUS', 'status 는 active · closed 입니다.');
    }
    const has = (k: string) => Object.prototype.hasOwnProperty.call(patch, k);
    const [row] = rowsOf(await this.dataSource.query(
      `UPDATE semi_franchises SET
          name = COALESCE($2, name),
          status = COALESCE($3, status),
          community_key = CASE WHEN $4 THEN $5 ELSE community_key END,
          payment_receiver_key = CASE WHEN $6 THEN $7 ELSE payment_receiver_key END,
          updated_at = NOW()
        WHERE id = $1
      RETURNING id, key, name, organization_id, status, payment_receiver_key, community_key`,
      [
        sf.id,
        patch.name?.trim() || null,
        patch.status ?? null,
        has('communityKey'),
        patch.communityKey?.trim() || null,
        has('paymentReceiverKey'),
        patch.paymentReceiverKey?.trim() || null,
      ],
    ));
    return row;
  }

  async assignOperator(key: string, userId: string, assignedBy: string) {
    const sf = await this.getByKey(key);
    if (!sf) throw new NeturePharmacyError(404, 'SEMI_FRANCHISE_NOT_FOUND', '세미프랜차이즈를 찾을 수 없습니다.');
    // 담당 지정은 이미 Neture 운영 role 을 가진 사용자에게만 — 담당 관계가 role 을 대신하지 않는다.
    const [hasRole] = await this.dataSource.query(
      `SELECT 1 FROM role_assignments
        WHERE user_id = $1 AND role IN ('neture:operator','neture:admin') AND is_active = true LIMIT 1`,
      [userId],
    );
    if (!hasRole) throw new NeturePharmacyError(409, 'NOT_NETURE_OPERATOR', 'Neture 운영자 role 이 없는 사용자입니다.');
    const rows = await this.dataSource.query(
      `INSERT INTO semi_franchise_operators (semi_franchise_id, user_id, assigned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (semi_franchise_id, user_id) WHERE revoked_at IS NULL DO NOTHING
       RETURNING id`,
      [sf.id, userId, assignedBy],
    );
    return { assigned: rows.length > 0 };
  }

  async revokeOperator(key: string, userId: string) {
    const sf = await this.getByKey(key);
    if (!sf) throw new NeturePharmacyError(404, 'SEMI_FRANCHISE_NOT_FOUND', '세미프랜차이즈를 찾을 수 없습니다.');
    const rows = rowsOf(await this.dataSource.query(
      `UPDATE semi_franchise_operators SET revoked_at = NOW()
        WHERE semi_franchise_id = $1 AND user_id = $2 AND revoked_at IS NULL RETURNING id`,
      [sf.id, userId],
    ));
    return { revoked: rows.length > 0 };
  }
}
