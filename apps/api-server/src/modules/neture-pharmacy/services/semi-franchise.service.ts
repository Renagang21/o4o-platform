import { BUSINESS_OPERATOR_PREDICATE, hasBusinessOperatorAccess } from './business-operator-access.js';
import { recordOperation } from '../../../services/operations/operation-audit.js';
import { hasCooperativeOperatorAccess } from './cooperative-operator-access.js';
import { recordEnrollmentPolicies, recordEnrollmentApplication, type EnrollmentPolicyReference } from '../../policy-acceptance/service-enrollment-policy.service.js';
import { businessCommunityKeyTaken } from '../../../services/community/community-key-namespace.js';
/**
 * 세미프랜차이즈 = 데이터 행 (DESIGN §1 R3 · R4 · §3-2)
 *
 * - 약국 조직 단위 가입(신청 · 승인 · 정지 · 종료). 내 매장(약국) 승인이 세미프랜차이즈 가입을 자동 승인하지 않는다.
 * - 신청 · 승인(재활성화 포함) 시점에 **현재** Neture 메인 가입 active 를 직접 확인한다 — 내 매장 승인을 거쳤다는
 *   간접 충족에 기대지 않는다(이후 Neture 가입 상태가 바뀔 수 있다). 정지 연쇄 정책은 별도.
 * - 담당 운영자 판정 = 사업 한정 역할 또는 유효 Neture 운영 역할 + 활성 담당 관계.
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
import {
  NETURE_MAIN_SERVICE_KEY,
  assertNetureMainMembershipActive,
  resolveNetureMainMembershipStatus,
  type NetureMainMembershipRow,
} from '../../neture/services/neture-main-membership.js';
import { validateServiceFeatures, type PharmacyServiceFeature } from './service-features.js';

export interface SemiFranchiseRow {
  id: string;
  key: string;
  name: string;
  organization_id: string;
  status: 'active' | 'closed';
  payment_receiver_key: string | null;
  community_key: string | null;
  registration_conditions?: string | null;
  service_features?: PharmacyServiceFeature[];
}

const SF_COLUMNS = `sf.id, sf.key, sf.name, sf.organization_id, sf.status, sf.payment_receiver_key, sf.community_key, (SELECT metadata->>'registrationConditions' FROM organizations WHERE id = sf.organization_id) AS registration_conditions, (SELECT COALESCE(metadata->'serviceFeatures', '[]'::jsonb) FROM organizations WHERE id = sf.organization_id) AS service_features`;
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
    const rows = await this.dataSource.query<Array<{ key: string; communityKey: string | null; [field: string]: unknown }>>(
      `SELECT sf.key, sf.name, sf.community_key AS "communityKey", (SELECT metadata->>'registrationConditions' FROM organizations WHERE id = sf.organization_id) AS "registrationConditions",
              sfm.id AS "membershipId", sfm.status AS "membershipStatus", sfm.reason, sfm.applied_at AS "appliedAt",
              sfm.decided_at AS "decidedAt"
         FROM semi_franchises sf
         LEFT JOIN semi_franchise_memberships sfm
           ON sfm.semi_franchise_id = sf.id AND sfm.organization_id = $1
        WHERE sf.status = 'active'
        ORDER BY (sf.key = 'pharmacy') DESC, sf.name, sf.key`,
      [organizationId],
    );
    return rows.map(row => ({ ...row, communityKey: row.communityKey || `business:${row.key}` }));
  }

  async apply(organizationId: string, userId: string, key: string, application: { acceptedConditions?: boolean; conditions?: string; note?: string; policyReferences?: EnrollmentPolicyReference[] } = {}) {
    if (application.note !== undefined && (typeof application.note !== 'string' || application.note.length > 2000))
      throw new NeturePharmacyError(400, 'INVALID_APPLICATION', '추가 신청 내용은 2000자 이내로 입력해 주세요.');
    return this.dataSource.transaction(async (m) => {
      await assertNetureMainMembershipActive(m, userId);
      const [sf]: SemiFranchiseRow[] = await m.query(`SELECT sf.id, sf.key, sf.name, sf.organization_id, sf.status, sf.payment_receiver_key, sf.community_key, owner.metadata->>'registrationConditions' AS registration_conditions FROM semi_franchises sf JOIN organizations owner ON owner.id = sf.organization_id WHERE sf.key = $1 FOR SHARE OF sf, owner`, [key]);
      if (!sf || sf.status !== 'active') throw new NeturePharmacyError(404, 'SEMI_FRANCHISE_NOT_FOUND', '세미프랜차이즈를 찾을 수 없습니다.');
      if (sf.registration_conditions && application.acceptedConditions !== true)
        throw new NeturePharmacyError(400, 'CONDITIONS_REQUIRED', '서비스 가입 조건을 확인하고 동의해 주세요.');
      if ((application.conditions ?? '') !== (sf.registration_conditions ?? ''))
        throw new NeturePharmacyError(409, 'CONDITIONS_CHANGED', '가입 조건이 변경되었습니다. 목록을 새로고침하고 다시 확인해 주세요.');
      const policies = key === 'pharmacy' ? await recordEnrollmentPolicies(m, userId, 'kpa-society', application.policyReferences) : [];
      const saveApplication = async (membershipId: string) => {
        if (key === 'pharmacy') await recordEnrollmentApplication(m, userId, 'kpa-society', { type: 'pharmacy_business_application', id: membershipId, resourceId: sf.id, conditions: { conditions: sf.registration_conditions || null, accepted: application.acceptedConditions === true, note: application.note?.trim() || null } }, policies);
        return m.query(
        `UPDATE organizations SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{semiFranchiseApplications}',
          COALESCE(metadata->'semiFranchiseApplications', '{}'::jsonb) || jsonb_build_object($2::text, $3::jsonb)) WHERE id = $1`,
        [organizationId, key, JSON.stringify({ conditions: sf.registration_conditions || null, accepted: application.acceptedConditions === true, note: application.note?.trim() || null, appliedBy: userId, appliedAt: new Date().toISOString(), applicationPolicies: policies })],
      );
      };
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
        await saveApplication(row.id);
        return row;
      }
      const [row] = await m.query(
        `INSERT INTO semi_franchise_memberships (semi_franchise_id, organization_id, status, applied_by)
         VALUES ($1, $2, 'pending', $3) RETURNING id, status`,
        [sf.id, organizationId, userId],
      );
      await saveApplication(row.id);
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
    return hasBusinessOperatorAccess(this.dataSource, userId, semiFranchiseId);
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
         WHERE ${BUSINESS_OPERATOR_PREDICATE}
        ORDER BY sf.name, sf.key`,
      [userId],
    );
  }

  /** 가입 신청 목록 — 운영자가 약국 자격을 독립 확인할 수 있게 내 매장(약국) 신청 원장 정보를 함께 준다. */
  async listMemberships(sf: SemiFranchiseRow, status?: string) {
    const s = status && status !== 'all' ? status : null;
    return this.dataSource.query(
      `SELECT sfm.id, sfm.status, sfm.applied_at AS "appliedAt", sfm.decided_at AS "decidedAt", sfm.reason, o.metadata->'semiFranchiseApplications'->$3 AS application,
              o.id AS "organizationId", o.name AS "organizationName", o.address AS "organizationAddress",
              npm.status AS "basicMembershipStatus", npm.business_number AS "businessNumber",
              npm.pharmacist_license_number AS "pharmacistLicenseNumber"
         FROM semi_franchise_memberships sfm
         JOIN organizations o ON o.id = sfm.organization_id
         LEFT JOIN neture_pharmacy_memberships npm ON npm.organization_id = sfm.organization_id
        WHERE sfm.semi_franchise_id = $1 AND ($2::text IS NULL OR sfm.status = $2)
        ORDER BY sfm.applied_at DESC, sfm.id`,
      [sf.id, s, sf.key],
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
          `SELECT sfm.applied_by AS sf_applicant_user_id FROM semi_franchise_memberships sfm
             JOIN neture_pharmacy_memberships npm ON npm.organization_id = sfm.organization_id AND npm.status = 'active'
            WHERE sfm.id = $1`,
          [membershipId],
        );
        if (!basic) {
          throw new NeturePharmacyError(409, 'BASIC_MEMBERSHIP_NOT_ACTIVE', '내 매장(약국) 승인이 된 약국이 아닙니다.');
        }
        // 이 세미프랜차이즈 가입을 신청한 사람(`applied_by` — 약국을 만든 사람과 다를 수 있다)의
        // 현재 Neture 메인 가입 상태를 직접 확인한다. 신청자가 없으면(계정 삭제) 'none' 으로 승인하지 않는다.
        await assertNetureMainMembershipActive(m, basic.sf_applicant_user_id, 'applicant');
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

  /**
   * operators = 이 화면에서 지정 · 해제하는 개별 담당(semi_franchise_operators).
   * roleOperators = 운영자 관리 화면이 지정한 사업 한정 역할(neture:{key}_admin · _operator, 조회 전용) —
   *   BUSINESS_OPERATOR_PREDICATE 의 사업 key 역할 분기와 같은 조건. 개별 담당 해제로 풀리지 않으므로 섞지 않는다.
   *   협동조합(pharmcoop)은 cooperatives 연결 판정이 따로 있어 여기서 집계하지 않는다.
   */
  async listAll() {
    const rows = await this.dataSource.query<Array<{ roleOperators: Array<NetureMainMembershipRow & Record<string, unknown>> }>>(
      `SELECT ${SF_COLUMNS},
              (SELECT count(*)::int FROM semi_franchise_memberships x WHERE x.semi_franchise_id = sf.id AND x.status = 'active') AS "activeMemberCount",
              COALESCE((SELECT json_agg(json_build_object('userId', op.user_id, 'assignedAt', op.assigned_at) ORDER BY op.assigned_at)
                          FROM semi_franchise_operators op WHERE op.semi_franchise_id = sf.id AND op.revoked_at IS NULL), '[]'::json) AS operators,
              COALESCE((SELECT json_agg(json_build_object(
                                 'userId', ra.user_id, 'role', ra.role, 'email', u.email,
                                 'name', COALESCE(NULLIF(btrim(u.name), ''), NULLIF(btrim(concat_ws(' ', u."lastName", u."firstName")), ''), NULLIF(btrim(u.nickname), '')),
                                 'account_status', u.status, 'account_active', u."isActive",
                                 'email_verified', u."isEmailVerified", 'membership_status', sm.status
                               ) ORDER BY ra.role, ra.user_id)
                          FROM role_assignments ra JOIN users u ON u.id = ra.user_id
                          LEFT JOIN service_memberships sm ON sm.user_id = u.id AND sm.service_key = $1
                         WHERE sf.key IN ('pharmacy','carepharm','megapharm')
                           AND ra.role IN ('neture:' || sf.key || '_admin', 'neture:' || sf.key || '_operator')
                           AND ra.is_active = true
                           AND (ra.valid_from IS NULL OR ra.valid_from <= CURRENT_TIMESTAMP)
                           AND (ra.valid_until IS NULL OR ra.valid_until >= CURRENT_TIMESTAMP)), '[]'::json) AS "roleOperators"
         FROM semi_franchises sf ORDER BY (sf.key = 'pharmacy') DESC, sf.name`,
      [NETURE_MAIN_SERVICE_KEY],
    );
    // 사업 운영 경로 가드는 역할과 함께 Neture 메인 이용 자격 active 를 요구한다 — 같은 판정으로 자격을 따로 알려 준다.
    return rows.map(row => ({
      ...row,
      roleOperators: (row.roleOperators ?? []).map(({ account_status, account_active, email_verified, membership_status, ...op }) => ({
        ...op,
        membershipStatus: resolveNetureMainMembershipStatus({ account_status, account_active, email_verified, membership_status }),
      })),
    }));
  }

  async create(input: { key: string; name: string; communityKey?: string | null; registrationConditions?: string; serviceFeatures?: unknown }, actorId: string | null = null): Promise<SemiFranchiseRow> {
    const serviceFeatures = validateServiceFeatures(input.serviceFeatures === undefined ? [] : input.serviceFeatures);
    const key = typeof input.key === 'string' ? input.key.trim().toLowerCase() : '';
    if (input.registrationConditions !== undefined && (typeof input.registrationConditions !== 'string' || input.registrationConditions.length > 4000)) throw new NeturePharmacyError(400, 'INVALID_CONDITIONS', '가입 조건은 4000자 이내입니다.');
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!KEY_RE.test(key)) throw new NeturePharmacyError(400, 'INVALID_KEY', 'key 는 영문 소문자 · 숫자 · - 2~63자입니다.');
    if (!name || name.length > 255) throw new NeturePharmacyError(400, 'INVALID_NAME', '이름을 입력해 주세요.');
    return await this.dataSource.transaction(async (m) => {
      const [dup] = await m.query(`SELECT 1 FROM semi_franchises WHERE key = $1`, [key]);
      if (dup) throw new NeturePharmacyError(409, 'KEY_IN_USE', '이미 있는 key 입니다.');
      const communityKey = input.communityKey?.trim() || null;
      if (communityKey && (!KEY_RE.test(communityKey) || await businessCommunityKeyTaken(m, communityKey))) {
        throw new NeturePharmacyError(409, 'COMMUNITY_KEY_IN_USE', '독립 커뮤니티와 다른 주소를 사용해 주세요.');
      }
      // 운영 조직 — 이 세미프랜차이즈 이벤트 원장(OPL)의 소유 조직.
      const [org] = await m.query(
        `INSERT INTO organizations (name, code, type, "isActive", metadata) VALUES ($1, $2, 'semi_franchise', true, $3::jsonb) RETURNING id`,
        [`${name} 세미프랜차이즈 운영`, `semi-franchise-${key}`, JSON.stringify({ registrationConditions: input.registrationConditions?.trim() || null, serviceFeatures })],
      );
      const [row] = await m.query(
        `INSERT INTO semi_franchises (key, name, organization_id, community_key)
         VALUES ($1, $2, $3, $4)
         RETURNING id, key, name, organization_id, status, payment_receiver_key, community_key`,
        [key, name, org.id, communityKey],
      );
      await recordOperation(m, 'neture', actorId, 'business.admin.create', { businessId: row.id, key });
      return { ...row, service_features: serviceFeatures };
    });
  }

  /**
   * 이름 · 상태 · 커뮤니티 연결 · 결제 수취 주체 키 변경.
   * 수취 주체 키는 사업 결정(D1)이 내려진 뒤 관리자가 명시적으로 넣는다 — 코드가 운영자를 수취 주체로 간주하지 않는다.
   */
  async update(
    key: string,
    patch: { name?: string; status?: 'active' | 'closed'; communityKey?: string | null; paymentReceiverKey?: string | null; registrationConditions?: string; serviceFeatures?: unknown },
    actorId: string | null = null,
  ): Promise<SemiFranchiseRow> {
    const serviceFeatures = patch.serviceFeatures === undefined ? undefined : validateServiceFeatures(patch.serviceFeatures);
    const sf = await this.getByKey(key);
    if (!sf) throw new NeturePharmacyError(404, 'SEMI_FRANCHISE_NOT_FOUND', '세미프랜차이즈를 찾을 수 없습니다.');
    if (patch.status && patch.status !== 'active' && patch.status !== 'closed') {
      throw new NeturePharmacyError(400, 'INVALID_STATUS', 'status 는 active · closed 입니다.');
    }
    return this.dataSource.transaction(async (m) => {
      const communityKey = patch.communityKey?.trim() || null;
      if (communityKey && (!KEY_RE.test(communityKey) || await businessCommunityKeyTaken(m, communityKey, sf.id))) {
        throw new NeturePharmacyError(409, 'COMMUNITY_KEY_IN_USE', '독립 커뮤니티와 다른 주소를 사용해 주세요.');
      }
      if (patch.registrationConditions !== undefined) {
        if (typeof patch.registrationConditions !== 'string' || patch.registrationConditions.length > 4000) throw new NeturePharmacyError(400, 'INVALID_CONDITIONS', '가입 조건은 4000자 이내입니다.');
        await m.query(`UPDATE organizations SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('registrationConditions', $2::text) WHERE id = $1`, [sf.organization_id, patch.registrationConditions.trim()]);
      }
      if (serviceFeatures !== undefined) {
        await m.query(`UPDATE organizations SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('serviceFeatures', $2::jsonb) WHERE id = $1`, [sf.organization_id, JSON.stringify(serviceFeatures)]);
      }
      const has = (k: string) => Object.prototype.hasOwnProperty.call(patch, k);
      const [row] = rowsOf(await m.query(
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
      await recordOperation(m, 'neture', actorId, 'business.admin.update', { businessId: sf.id, fields: Object.keys(patch) });
      return { ...row, registration_conditions: patch.registrationConditions?.trim() ?? sf.registration_conditions, service_features: serviceFeatures ?? sf.service_features ?? [] };
    });
  }

  async assignOperator(key: string, userId: string, assignedBy: string) {
    const sf = await this.getByKey(key);
    if (!sf) throw new NeturePharmacyError(404, 'SEMI_FRANCHISE_NOT_FOUND', '세미프랜차이즈를 찾을 수 없습니다.');
    return this.dataSource.transaction(async manager => {
      if (!(await hasCooperativeOperatorAccess(manager, userId))) throw new NeturePharmacyError(409, 'NOT_NETURE_OPERATOR', '현재 Neture 운영 권한과 메인 이용 자격이 필요합니다.');
      const rows = await manager.query(
        `INSERT INTO semi_franchise_operators (semi_franchise_id, user_id, assigned_by)
         VALUES ($1, $2, $3) ON CONFLICT (semi_franchise_id, user_id) WHERE revoked_at IS NULL DO NOTHING RETURNING id`,
        [sf.id, userId, assignedBy]);
      if (rows.length) await recordOperation(manager, 'neture', assignedBy, 'business.admin.operator_assign', { businessId: sf.id, userId });
      return { assigned: rows.length > 0 };
    });
  }

  async revokeOperator(key: string, userId: string, actorId: string | null = null) {
    const sf = await this.getByKey(key);
    if (!sf) throw new NeturePharmacyError(404, 'SEMI_FRANCHISE_NOT_FOUND', '세미프랜차이즈를 찾을 수 없습니다.');
    return this.dataSource.transaction(async manager => {
      const rows = rowsOf(await manager.query(
        `UPDATE semi_franchise_operators SET revoked_at = NOW()
          WHERE semi_franchise_id = $1 AND user_id = $2 AND revoked_at IS NULL RETURNING id`, [sf.id, userId]));
      if (rows.length) await recordOperation(manager, 'neture', actorId, 'business.admin.operator_revoke', { businessId: sf.id, userId });
      return { revoked: rows.length > 0 };
    });
  }
}
