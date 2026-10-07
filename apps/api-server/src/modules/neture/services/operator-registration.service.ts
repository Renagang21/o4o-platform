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
import { isAdminTierRoleName } from '../../../utils/role-revoke-safety.js';
import { demoAccountService } from '../../../services/auth/demo-account.service.js';

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
              COALESCE(u."businessInfo"->>'representativeName', u."businessInfo"->>'ceoName') AS "representativeName",
              u."businessInfo"->>'taxInvoiceEmail' AS "taxInvoiceEmail",
              u."businessInfo"->>'contactName' AS "contactName",
              u."businessInfo"->>'managerPhone' AS "managerPhone",
              u."businessInfo"->>'address' AS "businessAddress",
              u."businessInfo"->>'address2' AS "businessAddressDetail",
              u."businessInfo"->>'businessType' AS "businessType",
              -- WO-O4O-OPERATOR-BUSINESS-REGISTRATION-DISPLAY-ALIGNMENT-V1:
              --   사업자등록증 4 canonical 중 businessType 외 3 필드 추가 projection.
              u."businessInfo"->>'businessItem' AS "businessItem",
              u."businessInfo"->>'businessEntityType' AS "businessEntityType",
              u."businessInfo"->>'businessStartDate' AS "businessStartDate",
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
   *   3. (제거) role_assignment 생성 · supplier 자동 생성 — Neture 가입 승인은 연결 서비스 원장 · role 을
   *      만들지 않는다(CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1 §10 E4). 공급자는 공급자 신청 · 승인으로만.
   *
   * WO-O4O-NETURE-SUPPLIER-APPROVAL-ROLE-ASSIGN-FIX-V1:
   *   UPDATE...RETURNING 제거 — TypeORM queryRunner에서 RETURNING 컬럼이 null 반환되는
   *   알려진 버그로 rawRole이 항상 'member'가 되어 supplier role이 미생성되던 문제 수정.
   *   SELECT → UPDATE 분리 패턴으로 변경.
   */
  async approveRegistration(userId: string, approvedBy: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. 먼저 현재 role 조회 (UPDATE...RETURNING 의존 제거 — CLAUDE.md TypeORM queryRunner 주의사항)
      const [smRow] = await queryRunner.query(
        `SELECT id, role FROM service_memberships
         WHERE user_id = $1 AND service_key = 'neture' AND status IN ('pending', 'rejected')`,
        [userId],
      );

      if (!smRow) {
        throw new Error('REGISTRATION_NOT_FOUND');
      }

      // WO-O4O-NETURE-MEMBER-DATA-INTEGRITY-CLEANUP-V1:
      // users 존재 검증 — supplier 생성 전 users 행이 반드시 유효해야 함.
      // FK ON DELETE CASCADE가 DB 레벨 보호를 담당하지만,
      // 승인 트랜잭션 내에서도 명시적으로 확인해 고아 데이터 생성을 선차단한다.
      const [userRow] = await queryRunner.query(
        `SELECT id, status FROM users WHERE id = $1`,
        [userId],
      );
      if (!userRow) {
        throw new Error('USER_NOT_FOUND');
      }

      // Demo 계정의 role · membership 은 고정 — write 전에 거절(WO-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1).
      await demoAccountService.assertNotDemoAccount(userId, queryRunner.manager);

      // 2. service_memberships 승인 (RETURNING 없음)
      await queryRunner.query(
        `UPDATE service_memberships
         SET status = 'active', approved_by = $1, approved_at = NOW(), updated_at = NOW()
         WHERE user_id = $2 AND service_key = 'neture' AND status IN ('pending', 'rejected')`,
        [approvedBy, userId],
      );

      // 3. users 상태 활성화 (camelCase columns)
      await queryRunner.query(
        `UPDATE users
         SET status = 'active', "isActive" = true, "approvedAt" = NOW(), "approvedBy" = $1, "updatedAt" = NOW()
         WHERE id = $2 AND status IN ('PENDING', 'pending', 'ACTIVE', 'rejected')`,
        [approvedBy, userId],
      );

      // 4. Neture 가입 승인은 **role 을 부여하지 않고 공급자도 만들지 않는다** (CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1 §10 E4).
      //   Neture 가입 승인 = 메인 AI 이용 + 연결 서비스 신청 자격. 공급자 · 내 매장(약국) · 세미프랜차이즈는
      //   각자 신청 · 승인하며 그 원장(neture_suppliers 등)과 role 은 그 승인 경로만 만든다.
      //   과거 이 자리의 bare role 부여(`sm.role` 원문)와 supplier ONE-STEP 자동 생성은 제거했다
      //   (WO-O4O-NETURE-SUPPLIER-APPROVAL-AND-PROFILE-COMPLETION-SEPARATION-V1 의 '회원 승인 = 공급자 승인' 통합 폐기).
      //
      // WO-O4O-ROLE-ASSIGNMENT-CONTRACT-CONSISTENCY-AUDIT-AND-HARDENING-V1 (1) 방어는 유지한다:
      //   과거 API 가 남긴 role='operator' 등 관리자 계열 membership 행은 승인 자체를 거부한다.
      const rawRole = smRow.role || 'member';
      if (isAdminTierRoleName(rawRole)) {
        throw new Error('ROLE_PROMOTION_NOT_ALLOWED');
      }

      // 5. (은퇴) partner role → neture.neture_partners 자동 생성 — WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1

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
    await demoAccountService.assertNotDemoAccount(userId, this.dataSource);
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
      if (role === 'supplier' && (r.businessNumber || r.licenseNumber)) {
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
