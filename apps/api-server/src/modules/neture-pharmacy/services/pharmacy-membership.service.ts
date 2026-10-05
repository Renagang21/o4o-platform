/**
 * Neture 기본 가입 (약국 1 = 기본 가입 1 = 조직 1 = 내 매장 1)
 * DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1 §3-1 · §5
 *
 * - 신청: 조직(type='pharmacy') + owner 관계 + 원장(pending) 을 한 트랜잭션에.
 * - 자격 확인: 운영자가 원장의 사업자번호 · 약사 면허번호를 검토(operator_review). 자동 검증 · 점수 없음.
 * - kpa-society 가입 · kpa_members · kpa_pharmacist_profiles 를 읽지 않는다(재해석 금지).
 * - 매장 판정은 원장 status='active' 가 한다. 승인 시 role 기반 소비처용 표식(neture:store_owner 등)을 붙이고
 *   정지 · 종료 시 거둔다(provisioner). 표식 실패는 원장 판정에 영향 없음.
 */
import type { DataSource, EntityManager } from 'typeorm';
import {
  NeturePharmacyError,
  canReapply,
  nextMembershipStatus,
  type MembershipAction,
  type MembershipStatus,
  rowsOf,
} from '../constants.js';
import logger from '../../../utils/logger.js';

export interface PharmacyApplicationInput {
  pharmacyName: string;
  businessNumber: string;
  pharmacistLicenseNumber: string;
  address?: string | null;
  phone?: string | null;
}

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

export function normalizeBusinessNumber(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const digits = raw.replace(/[^0-9]/g, '');
  return digits.length === 10 ? digits : null;
}

function cleanText(raw: unknown, max: number): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim();
  return v.length > 0 && v.length <= max ? v : null;
}

export function validateApplication(input: Partial<PharmacyApplicationInput>): PharmacyApplicationInput {
  const pharmacyName = cleanText(input.pharmacyName, 255);
  const businessNumber = normalizeBusinessNumber(input.businessNumber);
  const pharmacistLicenseNumber = cleanText(input.pharmacistLicenseNumber, 30);
  if (!pharmacyName) throw new NeturePharmacyError(400, 'INVALID_PHARMACY_NAME', '약국 이름을 입력해 주세요.');
  if (!businessNumber) throw new NeturePharmacyError(400, 'INVALID_BUSINESS_NUMBER', '사업자등록번호 10자리를 입력해 주세요.');
  if (!pharmacistLicenseNumber) throw new NeturePharmacyError(400, 'INVALID_LICENSE_NUMBER', '약사 면허번호를 입력해 주세요.');
  return {
    pharmacyName,
    businessNumber,
    pharmacistLicenseNumber,
    address: cleanText(input.address, 500),
    phone: cleanText(input.phone, 50),
  };
}

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
      `SELECT ${SELECT_COLUMNS}
         FROM neture_pharmacy_memberships npm
         JOIN organization_members om
           ON om.organization_id = npm.organization_id AND om.user_id = $1
          AND om.role = 'owner' AND om.left_at IS NULL
        ORDER BY npm.created_at ASC
        LIMIT 1`,
      [userId],
    );
    return rows[0] ?? null;
  }

  async apply(userId: string, raw: Partial<PharmacyApplicationInput>): Promise<PharmacyMembershipRow> {
    const input = validateApplication(raw);
    return this.dataSource.transaction(async (m) => {
      // 같은 사용자의 동시 신청을 직렬화한다.
      await m.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`neture-pharmacy-apply:${userId}`]);

      const existing = await this.findMine(userId, m);
      if (existing && !canReapply(existing.status)) {
        throw new NeturePharmacyError(409, 'ALREADY_APPLIED', '이미 신청했거나 가입된 약국이 있습니다.');
      }

      const [dup] = await m.query(
        `SELECT 1 FROM neture_pharmacy_memberships
          WHERE business_number = $1 AND status IN ('pending','active','suspended')
            AND ($2::uuid IS NULL OR id <> $2::uuid)
          LIMIT 1`,
        [input.businessNumber, existing?.id ?? null],
      );
      if (dup) {
        throw new NeturePharmacyError(409, 'BUSINESS_NUMBER_IN_USE', '이미 가입 진행 중인 사업자등록번호입니다.');
      }

      if (existing) {
        // 재신청 — 같은 행 · 같은 조직(약국 1 : 매장 1).
        await m.query(
          `UPDATE organizations SET name = $2, business_number = $3,
                  address = COALESCE($4, address), phone = COALESCE($5, phone), "updatedAt" = NOW()
            WHERE id = $1`,
          [existing.organization_id, input.pharmacyName, input.businessNumber, input.address, input.phone],
        );
        const [row] = rowsOf(await m.query(
          `UPDATE neture_pharmacy_memberships npm
              SET status = 'pending', pharmacy_name = $2, business_number = $3, pharmacist_license_number = $4,
                  applied_at = NOW(), decided_by = NULL, decided_at = NULL, reason = NULL, updated_at = NOW()
            WHERE id = $1
          RETURNING ${SELECT_COLUMNS}`,
          [existing.id, input.pharmacyName, input.businessNumber, input.pharmacistLicenseNumber],
        ));
        return row;
      }

      const [org] = await m.query(
        `INSERT INTO organizations (name, code, type, business_number, address, phone, created_by_user_id, "isActive")
         VALUES ($1, 'neture-pharm-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), 'pharmacy', $2, $3, $4, $5, true)
         RETURNING id`,
        [input.pharmacyName, input.businessNumber, input.address, input.phone, userId],
      );
      await m.query(
        `INSERT INTO organization_members (organization_id, user_id, role, is_primary, joined_at, created_at, updated_at)
         VALUES ($1, $2, 'owner', true, NOW(), NOW(), NOW())
         ON CONFLICT (organization_id, user_id) DO NOTHING`,
        [org.id, userId],
      );
      const [row] = await m.query(
        `INSERT INTO neture_pharmacy_memberships
           (organization_id, applicant_user_id, status, pharmacy_name, business_number, pharmacist_license_number)
         VALUES ($1, $2, 'pending', $3, $4, $5)
         RETURNING ${SELECT_COLUMNS.replace(/npm\./g, '')}`,
        [org.id, userId, input.pharmacyName, input.businessNumber, input.pharmacistLicenseNumber],
      );
      return row;
    });
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
      `SELECT ${SELECT_COLUMNS}, o.name AS organization_name, o.address AS organization_address
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
      const [row] = rowsOf(await m.query(
        `UPDATE neture_pharmacy_memberships npm
            SET status = $2, decided_by = $3, decided_at = NOW(), reason = $4, updated_at = NOW()
          WHERE id = $1
        RETURNING ${SELECT_COLUMNS}`,
        [membershipId, next, operatorId, reason?.trim()?.slice(0, 1000) || null],
      ));
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
