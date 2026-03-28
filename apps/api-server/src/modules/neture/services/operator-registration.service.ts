/**
 * OperatorRegistrationService
 * WO-O4O-NETURE-REGISTRATION-SYSTEM-FIX-V1
 * WO-O4O-NETURE-REGISTRATION-AUTH-GUARD-FIX-V1
 * WO-O4O-NETURE-RBAC-APPROVAL-PRODUCT-FLOW-INTEGRATION-V1
 *
 * 가입 신청 조회/승인/거부 — users + service_memberships 기반
 *
 * Column naming:
 * - users 테이블: camelCase (TypeORM default, SnakeNamingStrategy 비활성)
 *   → "businessInfo", "createdAt", "approvedAt", "approvedBy", "updatedAt"
 * - service_memberships 테이블: snake_case (Entity에 explicit name 지정)
 *   → service_key, approved_at, approved_by, rejection_reason, created_at, updated_at
 */
import type { DataSource } from 'typeorm';
import logger from '../../../utils/logger.js';

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
              u."businessInfo"->>'businessName' AS "companyName",
              u."businessInfo"->>'businessNumber' AS "businessNumber",
              u."businessInfo"->>'licenseNumber' AS "licenseNumber",
              sm.service_key AS "service",
              u."createdAt" AS "createdAt",
              sm.approved_at AS "processedAt",
              sm.approved_by AS "processedBy",
              sm.rejection_reason AS "rejectReason",
              sm.operator_notes AS "operatorNotes",
              ns.status AS "supplierStatus"
       FROM users u
       JOIN service_memberships sm ON sm.user_id = u.id
       LEFT JOIN neture_suppliers ns ON ns.user_id = u.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY u."createdAt" DESC`,
      params,
    );

    return rows;
  }

  /**
   * 가입 승인
   * WO-NETURE-MEMBERSHIP-APPROVAL-FLOW-STABILIZATION-V1:
   *   1. service_memberships.status → 'active'
   *   2. users.status → 'ACTIVE' (pending/rejected 모두 처리)
   *   3. role_assignment 생성 (prefixed role — 'neture:supplier')
   *
   * WO-O4O-NETURE-RBAC-APPROVAL-PRODUCT-FLOW-INTEGRATION-V1:
   *   4. supplier role → neture_suppliers 레코드 자동 생성 (status='ACTIVE')
   *   5. organization 연동 (businessInfo 있는 경우)
   */
  async approveRegistration(userId: string, approvedBy: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. service_memberships 승인 (pending 또는 rejected → active)
      const smResult = await queryRunner.query(
        `UPDATE service_memberships
         SET status = 'active', approved_by = $1, approved_at = NOW(), updated_at = NOW()
         WHERE user_id = $2 AND service_key = 'neture' AND status IN ('pending', 'rejected')
         RETURNING id, role`,
        [approvedBy, userId],
      );

      if (!smResult?.length) {
        throw new Error('REGISTRATION_NOT_FOUND');
      }

      // 2. users 상태 활성화 (camelCase columns)
      await queryRunner.query(
        `UPDATE users
         SET status = 'active', "isActive" = true, "approvedAt" = NOW(), "approvedBy" = $1, "updatedAt" = NOW()
         WHERE id = $2 AND status IN ('PENDING', 'pending', 'ACTIVE', 'rejected')`,
        [approvedBy, userId],
      );

      // 3. role_assignment 생성 — prefixed role (neture:supplier, neture:partner 등)
      const rawRole = smResult[0]?.role || 'member';
      const prefixedRole = rawRole.includes(':') ? rawRole : `neture:${rawRole}`;
      await queryRunner.query(
        `INSERT INTO role_assignments (user_id, role, assigned_by, is_active, valid_from, created_at, updated_at)
         VALUES ($1, $2, $3, true, NOW(), NOW(), NOW())
         ON CONFLICT (user_id, role, is_active) DO UPDATE SET updated_at = NOW()`,
        [userId, prefixedRole, approvedBy],
      );

      // 4. supplier role → neture_suppliers 자동 생성 (ONE-STEP 승인)
      if (rawRole === 'supplier') {
        const existingSupplier = await queryRunner.query(
          `SELECT id FROM neture_suppliers WHERE user_id = $1`,
          [userId],
        );
        if (!existingSupplier?.length) {
          const [userRow] = await queryRunner.query(
            `SELECT name, email, phone, "businessInfo" FROM users WHERE id = $1`,
            [userId],
          );
          const slug = `supplier-${userId.substring(0, 8)}`;
          const contactEmail = userRow?.email || null;
          const contactPhone = userRow?.phone || null;
          const bizInfo = userRow?.businessInfo;
          const bizName = bizInfo?.businessName || userRow?.name || '';
          const representativeName = userRow?.name || null;

          // neture_suppliers 생성 (status = 'ACTIVE')
          const [insertedSupplier] = await queryRunner.query(
            `INSERT INTO neture_suppliers (user_id, slug, contact_email, contact_phone, representative_name, status, approved_by, approved_at, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $6, NOW(), NOW(), NOW())
             ON CONFLICT (user_id) DO UPDATE SET status = 'ACTIVE', approved_by = $6, approved_at = NOW(), updated_at = NOW()
             RETURNING id`,
            [userId, slug, contactEmail, contactPhone, representativeName, approvedBy],
          );

          // organization 연동 (businessName이 있는 경우)
          if (bizName && insertedSupplier?.id) {
            const orgCode = `neture-${slug}`;
            const [org] = await queryRunner.query(
              `INSERT INTO organizations (name, code, type, is_active, created_at, updated_at)
               VALUES ($1, $2, 'supplier', true, NOW(), NOW())
               ON CONFLICT (code) DO UPDATE SET is_active = true, updated_at = NOW()
               RETURNING id`,
              [bizName, orgCode],
            );
            if (org?.id) {
              await queryRunner.query(
                `UPDATE neture_suppliers SET organization_id = $1 WHERE id = $2 AND organization_id IS NULL`,
                [org.id, insertedSupplier.id],
              );
            }
          }

          logger.info(`[Registration] Auto-created neture_suppliers for user ${userId} (ACTIVE) on approval`);
        } else {
          // 이미 존재하면 ACTIVE로 업데이트
          await queryRunner.query(
            `UPDATE neture_suppliers SET status = 'ACTIVE', approved_by = $1, approved_at = NOW(), updated_at = NOW()
             WHERE user_id = $2 AND status != 'ACTIVE'`,
            [approvedBy, userId],
          );
        }
      }

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
   * 운영자 메모 저장
   */
  async updateNotes(userId: string, notes: string): Promise<{ success: boolean }> {
    const result = await this.dataSource.query(
      `UPDATE service_memberships
       SET operator_notes = $1, updated_at = NOW()
       WHERE user_id = $2 AND service_key = 'neture'
       RETURNING id`,
      [notes || null, userId],
    );

    if (!result?.length) {
      throw new Error('REGISTRATION_NOT_FOUND');
    }

    return { success: true };
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
              u."businessInfo"->>'businessName' AS "companyName",
              u."businessInfo"->>'businessNumber' AS "businessNumber",
              u."businessInfo"->>'licenseNumber' AS "licenseNumber",
              u."createdAt" AS "createdAt"
       FROM users u
       JOIN service_memberships sm ON sm.user_id = u.id
       WHERE sm.service_key = 'neture' AND sm.status = 'pending'
       ORDER BY u."createdAt" DESC`,
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
