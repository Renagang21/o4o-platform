/**
 * 통합 가입 승인으로 연결되는 약국 원장과 기존 상태 전이.
 * 최초 조직·owner·약사 자격 연결은 MemberRegistrationService의 단일 승인에서 처리한다.
 * 별도 최초 신청 writer는 폐기했다. 과거 pending 원장 처리와 정지/종료 등 기존 생명주기는 보존한다.
 * 이 원장은 Neture 회원·직원 소속·개별 세미프렌챠이즈 서비스 가입과 서로 다른 축이다.
 */
import type { DataSource, EntityManager } from 'typeorm';
import {
  NeturePharmacyError,
  nextMembershipStatus,
  type MembershipAction,
  type MembershipStatus,
  rowsOf,
} from '../constants.js';
import logger from '../../../utils/logger.js';
import { assertNetureMainMembershipActive } from '../../neture/services/neture-main-membership.js';
import { connectDefaultPharmacyMembership } from './default-pharmacy-membership.js';

export interface PharmacyMembershipRow {
  id: string;
  organization_id: string;
  applicant_user_id: string;
  status: MembershipStatus;
  pharmacy_name: string;
  business_number: string;
  pharmacist_license_number: string;
  applied_at: string;
  decided_by: string | null;
  decided_at: string | null;
  reason: string | null;
}

/** 승인 · 정지 시 role 기반 소비처용 표식을 붙이고 거둔다. 원장이 판정 SSOT 라 실패해도 판정은 바뀌지 않는다. */
export interface PharmacyStoreProvisioner {
  activate(input: { userId: string; organizationId: string; pharmacyName: string; decidedBy: string }): Promise<void>;
  deactivate(input: { userId: string; organizationId: string }): Promise<void>;
}

const BUSINESS_PROFILE_SQL = `COALESCE(o.metadata->'businessProfile', '{}'::jsonb) || jsonb_build_object(
  'contactName', o.metadata->>'contactName', 'managerPhone', o.metadata->>'managerPhone',
  'contactEmail', o.metadata->>'contactEmail', 'taxInvoiceEmail', o.metadata->>'taxInvoiceEmail')`;

const SELECT_COLUMNS = `npm.id, npm.organization_id, npm.applicant_user_id, npm.status, npm.pharmacy_name,
  npm.business_number, npm.pharmacist_license_number, npm.applied_at, npm.decided_by, npm.decided_at, npm.reason`;

export class PharmacyMembershipService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly provisioner: PharmacyStoreProvisioner,
  ) {}

  /** 사용자가 owner 인 Neture 약국 원장(사용자당 1개). */
  async findMine(userId: string, exec: { query: EntityManager['query'] } = this.dataSource): Promise<PharmacyMembershipRow | null> {
    const rows = await exec.query(
      `SELECT ${SELECT_COLUMNS}, ${BUSINESS_PROFILE_SQL} AS business_profile, o.address, o.phone
         FROM neture_pharmacy_memberships npm
         JOIN organizations o ON o.id = npm.organization_id
         JOIN organization_members om
           ON om.organization_id = npm.organization_id AND om.user_id = $1
          AND om.role = 'owner' AND om.left_at IS NULL
        ORDER BY npm.created_at ASC
        LIMIT 1`,
      [userId],
    );
    return rows[0] ?? null;
  }

  async list(filter: { status?: string; q?: string; page?: number; limit?: number }): Promise<{
    items: Array<PharmacyMembershipRow & { organization_name: string; organization_address: string | null }>;
    total: number;
  }> {
    const limit = Math.min(Math.max(Number(filter.limit) || 20, 1), 100);
    const page = Math.max(Number(filter.page) || 1, 1);
    const status = filter.status && filter.status !== 'all' ? filter.status : null;
    const q = filter.q?.trim() ? `%${filter.q.trim()}%` : null;
    const where = `($1::text IS NULL OR npm.status = $1)
      AND ($2::text IS NULL OR npm.pharmacy_name ILIKE $2 OR npm.business_number LIKE $2)`;
    const items = await this.dataSource.query(
      `SELECT ${SELECT_COLUMNS}, o.name AS organization_name, o.address AS organization_address, ${BUSINESS_PROFILE_SQL} AS business_profile
         FROM neture_pharmacy_memberships npm
         JOIN organizations o ON o.id = npm.organization_id
        WHERE ${where}
        ORDER BY npm.applied_at DESC, npm.id
        LIMIT $3 OFFSET $4`,
      [status, q, limit, (page - 1) * limit],
    );
    const [{ count }] = await this.dataSource.query(
      `SELECT count(*)::int AS count FROM neture_pharmacy_memberships npm WHERE ${where}`,
      [status, q],
    );
    return { items, total: count };
  }

  /** 운영자 처리. 허용되지 않는 전이는 409. 활성 전이 · 비활성 전이에 매장 표식을 맞춘다. */
  async decide(
    operatorId: string,
    membershipId: string,
    action: MembershipAction,
    reason?: string | null,
  ): Promise<PharmacyMembershipRow> {
    const updated = await this.dataSource.transaction(async (m) => {
      const [current] = await m.query(
        `SELECT ${SELECT_COLUMNS} FROM neture_pharmacy_memberships npm WHERE npm.id = $1 FOR UPDATE`,
        [membershipId],
      );
      if (!current) throw new NeturePharmacyError(404, 'MEMBERSHIP_NOT_FOUND', '가입 신청을 찾을 수 없습니다.');
      const next = nextMembershipStatus(current.status, action);
      if (!next) {
        throw new NeturePharmacyError(409, 'INVALID_TRANSITION', `현재 상태(${current.status})에서 처리할 수 없습니다.`);
      }
      if (next === 'active') {
        // 승인 · 재활성화 시점의 **현재** Neture 가입 상태를 확인한다(신청 이후 바뀌었을 수 있다).
        await assertNetureMainMembershipActive(m, current.applicant_user_id, 'applicant');
        const qualified = await m.query(`SELECT id FROM kpa_pharmacist_profiles WHERE user_id=$1 AND qualification_status='approved'
          AND license_verified=true AND verified_at IS NOT NULL AND verified_by IS NOT NULL AND BTRIM(license_number)=BTRIM($2) FOR SHARE`,
          [current.applicant_user_id,current.pharmacist_license_number]);
        if(!qualified.length)throw new NeturePharmacyError(409,'PHARMACIST_QUALIFICATION_REQUIRED','신청 면허번호와 일치하는 공통 약사 자격을 먼저 승인해 주세요.');

      }
      const [row] = rowsOf(await m.query(
        `UPDATE neture_pharmacy_memberships npm
            SET status = $2, decided_by = $3, decided_at = NOW(), reason = $4, updated_at = NOW()
          WHERE id = $1
        RETURNING ${SELECT_COLUMNS}`,
        [membershipId, next, operatorId, reason?.trim()?.slice(0, 1000) || null],
      ));
      if (next === 'active') {
        await connectDefaultPharmacyMembership(m, {
          organizationId: row.organization_id, applicantId: row.applicant_user_id,
          approvedBy: operatorId, actorId: operatorId,
        });
      }
      return row as PharmacyMembershipRow;
    });

    try {
      if (updated.status === 'active') {
        await this.provisioner.activate({
          userId: updated.applicant_user_id,
          organizationId: updated.organization_id,
          pharmacyName: updated.pharmacy_name,
          decidedBy: operatorId,
        });
      } else if (updated.status === 'suspended' || updated.status === 'terminated') {
        await this.provisioner.deactivate({ userId: updated.applicant_user_id, organizationId: updated.organization_id });
      }
    } catch (err) {
      // 원장 상태가 판정 SSOT 다. 표식 동기화 실패는 기록만 하고 재처리(같은 전이 재호출 불가 → 운영 확인)로 남긴다.
      logger.error('[NeturePharmacyMembership] store marker sync failed', {
        membershipId,
        status: updated.status,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return updated;
  }
}
