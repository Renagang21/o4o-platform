/**
 * OperatorRegistrationService
 * WO-O4O-NETURE-REGISTRATION-SYSTEM-FIX-V1
 *
 * 가입 신청 조회/승인/거부 — users + service_memberships 기반
 */
import type { DataSource } from 'typeorm';

export class OperatorRegistrationService {
  constructor(private dataSource: DataSource) {}

  /**
   * 가입 신청 목록 조회
   * 조건: service_memberships.service_key = 'neture'
   */
  async listRegistrations(filters: { status?: string }) {
    const params: unknown[] = ['neture'];
    const conditions: string[] = [`sm.service_key = $1`];

    if (filters.status && typeof filters.status === 'string') {
      params.push(filters.status.toLowerCase());
      conditions.push(`sm.status = $${params.length}`);
    }

    const rows = await this.dataSource.query(
      `SELECT u.id,
              u.email,
              u.name,
              u.phone,
              sm.role,
              sm.status,
              u.business_info->>'businessName' AS "companyName",
              u.business_info->>'businessNumber' AS "businessNumber",
              u.business_info->>'licenseNumber' AS "licenseNumber",
              sm.service_key AS "service",
              u.created_at AS "createdAt",
              sm.approved_at AS "processedAt",
              sm.approved_by AS "processedBy",
              sm.rejection_reason AS "rejectReason"
       FROM users u
       JOIN service_memberships sm ON sm.user_id = u.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY u.created_at DESC`,
      params,
    );

    return rows;
  }

  /**
   * 가입 승인
   * service_memberships.status → 'active' + users.status → 'ACTIVE'
   */
  async approveRegistration(userId: string, approvedBy: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. service_memberships 승인
      const smResult = await queryRunner.query(
        `UPDATE service_memberships
         SET status = 'active', approved_by = $1, approved_at = NOW(), updated_at = NOW()
         WHERE user_id = $2 AND service_key = 'neture' AND status = 'pending'
         RETURNING id`,
        [approvedBy, userId],
      );

      if (!smResult?.length) {
        throw new Error('REGISTRATION_NOT_FOUND');
      }

      // 2. users 상태 활성화
      await queryRunner.query(
        `UPDATE users
         SET status = 'ACTIVE', approved_at = NOW(), approved_by = $1, updated_at = NOW()
         WHERE id = $2 AND status = 'PENDING'`,
        [approvedBy, userId],
      );

      await queryRunner.commitTransaction();
      return { success: true, userId };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 가입 거부
   * service_memberships.status → 'rejected'
   */
  async rejectRegistration(userId: string, rejectedBy: string, reason?: string) {
    const result = await this.dataSource.query(
      `UPDATE service_memberships
       SET status = 'rejected',
           approved_by = $1,
           approved_at = NOW(),
           rejection_reason = $2,
           updated_at = NOW()
       WHERE user_id = $3 AND service_key = 'neture' AND status = 'pending'
       RETURNING id`,
      [rejectedBy, reason || null, userId],
    );

    if (!result?.length) {
      throw new Error('REGISTRATION_NOT_FOUND');
    }

    return { success: true, userId };
  }

  /**
   * Copilot: 가입 신청 우선순위 분석
   * WO-O4O-NETURE-OPERATOR-COPILOT-REGISTRATION-V1
   */
  async getRegistrationCopilot() {
    const rows = await this.dataSource.query(
      `SELECT u.id,
              u.email,
              u.name,
              u.phone,
              sm.role,
              u.business_info->>'businessName' AS "companyName",
              u.business_info->>'businessNumber' AS "businessNumber",
              u.business_info->>'licenseNumber' AS "licenseNumber",
              u.created_at AS "createdAt"
       FROM users u
       JOIN service_memberships sm ON sm.user_id = u.id
       WHERE sm.service_key = 'neture' AND sm.status = 'pending'
       ORDER BY u.created_at DESC`,
    );

    const high: typeof rows = [];
    const medium: typeof rows = [];
    const low: typeof rows = [];

    for (const r of rows) {
      const role = (r.role || '').toLowerCase();
      if (role === 'partner' || (role === 'supplier' && (r.businessNumber || r.licenseNumber))) {
        high.push(r);
      } else if (role === 'supplier' || role === 'seller') {
        medium.push(r);
      } else {
        low.push(r);
      }
    }

    return {
      pendingCount: rows.length,
      high,
      medium,
      low,
    };
  }
}
