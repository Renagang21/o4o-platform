/**
 * Neture 파트너 서비스 신청 · 승인 (공급자 registerSupplier / approveSupplier 의 파트너 대칭)
 *
 * WO-O4O-NETURE-MAIN-ACCOUNT-AND-SUPPLIER-PARTNER-SERVICE-SEPARATION-V1
 *
 * 파트너 서비스 이용 상태의 단일 출처는 `neture.neture_partners.status` (소문자 enum).
 *   - 로그인 회원의 서비스 신청: pending 행 생성 (rejected 였다면 pending 으로 재신청)
 *   - 운영자 승인: pending → active + role_assignments 'partner' + service_memberships(neture) active
 *   - 운영자 반려: pending → rejected
 * O4O 계정 · Neture 회원 상태는 건드리지 않는다(승인 시 이미 있는 membership 만 active 로 정합).
 */

import type { DataSource } from 'typeorm';
import { roleAssignmentService } from '../../auth/services/role-assignment.service.js';
import logger from '../../../utils/logger.js';

export type PartnerServiceResult = {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
};

type PartnerRow = {
  id: string;
  name: string;
  business_name: string | null;
  status: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

const PARTNER_RETURNING = 'id, name, business_name, status, user_id, created_at, updated_at';

export class NeturePartnerServiceApplicationService {
  constructor(private readonly dataSource: DataSource) {}

  /** 로그인 회원 본인의 파트너 서비스 신청 */
  async applyPartner(
    userId: string,
    data: { name?: string; businessName?: string; description?: string },
  ): Promise<PartnerServiceResult> {
    const [userRow] = (await this.dataSource.query(`SELECT name, "businessInfo" FROM users WHERE id = $1`, [userId])) as Array<{
      name: string | null;
      businessInfo: { businessName?: string } | null;
    }>;
    if (!userRow) return { success: false, error: 'USER_NOT_FOUND' };

    const name = (data.name ?? '').trim() || userRow.businessInfo?.businessName || userRow.name || '';
    if (!name) return { success: false, error: 'MISSING_NAME' };
    const businessName = (data.businessName ?? '').trim() || null;
    const description = (data.description ?? '').trim() || null;

    const [existing] = (await this.dataSource.query(
      `SELECT id, status FROM neture.neture_partners WHERE user_id = $1 LIMIT 1`,
      [userId],
    )) as Array<{ id: string; status: string }>;

    if (existing) {
      const status = String(existing.status).toLowerCase();
      if (status !== 'rejected') {
        // pending · active · suspended · inactive 는 이미 관계가 있다 — 새로 신청하지 않는다.
        return { success: false, error: 'USER_ALREADY_HAS_PARTNER', data: { id: existing.id, status } };
      }
      const [row] = (await this.dataSource.query(
        `UPDATE neture.neture_partners
            SET status = 'pending', name = $2, business_name = COALESCE($3, business_name),
                description = COALESCE($4, description), updated_by = $1, updated_at = NOW()
          WHERE id = $5
          RETURNING ${PARTNER_RETURNING}`,
        [userId, name, businessName, description, existing.id],
      )) as PartnerRow[];
      logger.info(`[NeturePartnerService] Partner re-applied (rejected → pending): ${row.id} by user ${userId}`);
      return { success: true, data: this.toData(row) };
    }

    const [row] = (await this.dataSource.query(
      `INSERT INTO neture.neture_partners
         (name, business_name, type, status, description, user_id, created_by, updated_by, created_at, updated_at)
       VALUES ($2, $3, 'partner', 'pending', $4, $1, $1, $1, NOW(), NOW())
       RETURNING ${PARTNER_RETURNING}`,
      [userId, name, businessName, description],
    )) as PartnerRow[];
    logger.info(`[NeturePartnerService] Partner applied (pending): ${row.id} by user ${userId}`);
    return { success: true, data: this.toData(row) };
  }

  /** 운영자 콘솔 목록 (status 필터) */
  async listPartners(status?: string): Promise<Array<Record<string, unknown>>> {
    const params: unknown[] = [];
    let where = '';
    if (status) {
      params.push(String(status).toLowerCase());
      where = `WHERE LOWER(p.status) = $1`;
    }
    const rows = (await this.dataSource.query(
      `SELECT p.id, p.name, p.business_name, p.status, p.user_id, p.created_at, p.updated_at,
              u.email AS user_email, u.name AS user_name
         FROM neture.neture_partners p
         LEFT JOIN users u ON u.id = p.user_id
         ${where}
         ORDER BY p.created_at DESC`,
      params,
    )) as Array<PartnerRow & { user_email: string | null; user_name: string | null }>;
    return rows.map((r) => ({ ...this.toData(r), userEmail: r.user_email, userName: r.user_name }));
  }

  /** 운영자 승인: pending → active. role 'partner' 부여 + neture membership 이 있으면 active 정합. */
  async approvePartner(partnerId: string, approvedBy: string): Promise<PartnerServiceResult> {
    const [partner] = (await this.dataSource.query(
      `SELECT ${PARTNER_RETURNING} FROM neture.neture_partners WHERE id = $1`,
      [partnerId],
    )) as PartnerRow[];
    if (!partner) return { success: false, error: 'PARTNER_NOT_FOUND' };
    if (String(partner.status).toLowerCase() !== 'pending') return { success: false, error: 'INVALID_STATUS' };

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    let row: PartnerRow;
    try {
      [row] = (await queryRunner.query(
        `UPDATE neture.neture_partners SET status = 'active', updated_by = $2, updated_at = NOW()
          WHERE id = $1 RETURNING ${PARTNER_RETURNING}`,
        [partnerId, approvedBy],
      )) as PartnerRow[];
      if (row.user_id) {
        await queryRunner.query(
          `UPDATE service_memberships SET status = 'active', approved_by = $1, approved_at = NOW(), updated_at = NOW()
            WHERE user_id = $2 AND service_key = 'neture' AND status <> 'active'`,
          [approvedBy, row.user_id],
        );
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    if (row.user_id) {
      // RBAC SSOT (F9): role 쓰기는 roleAssignmentService 를 통해서만 (unprefixed 'partner' — supplier 와 동일 규약)
      await roleAssignmentService.assignRole({ userId: row.user_id, role: 'partner', assignedBy: approvedBy });
    }
    logger.info(`[NeturePartnerService] Partner approved: ${partnerId} by ${approvedBy}`);
    return { success: true, data: this.toData(row) };
  }

  /** 운영자 반려: pending → rejected (O4O 계정 · 다른 서비스 상태는 영향 없음) */
  async rejectPartner(partnerId: string, rejectedBy: string, reason?: string): Promise<PartnerServiceResult> {
    const [partner] = (await this.dataSource.query(`SELECT id, status FROM neture.neture_partners WHERE id = $1`, [partnerId])) as Array<{
      id: string;
      status: string;
    }>;
    if (!partner) return { success: false, error: 'PARTNER_NOT_FOUND' };
    if (String(partner.status).toLowerCase() !== 'pending') return { success: false, error: 'INVALID_STATUS' };

    const [row] = (await this.dataSource.query(
      `UPDATE neture.neture_partners
          SET status = 'rejected', updated_by = $2, updated_at = NOW(),
              metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('rejectionReason', $3::text)
        WHERE id = $1 RETURNING ${PARTNER_RETURNING}`,
      [partnerId, rejectedBy, reason ?? null],
    )) as PartnerRow[];
    logger.info(`[NeturePartnerService] Partner rejected: ${partnerId} by ${rejectedBy}`);
    return { success: true, data: this.toData(row) };
  }

  private toData(row: PartnerRow): Record<string, unknown> {
    return {
      id: row.id,
      name: row.name,
      businessName: row.business_name,
      status: String(row.status).toLowerCase(),
      userId: row.user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
