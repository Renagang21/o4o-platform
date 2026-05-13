/**
 * WO-O4O-NETURE-SUPPLIER-APPROVAL-ROLE-ASSIGN-FIX-V1
 *
 * 문제: operator-registration.service.ts에서 UPDATE...RETURNING 시
 *   TypeORM queryRunner가 RETURNING 컬럼을 null로 반환하는 버그로 인해
 *   rawRole이 항상 'member'가 되어 supplier role_assignment가 누락됨.
 *
 * 이 마이그레이션은 피해 계정을 복구한다:
 *   1. service_memberships.role='supplier', status='active' (neture) 이나
 *      role_assignments에 supplier role이 없는 계정 → supplier role 생성
 *   2. role='supplier'이나 neture_suppliers row가 없는 계정 → neture_suppliers 생성
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class FixNetureSupplierRoleAssignments20260923000000 implements MigrationInterface {
  name = 'FixNetureSupplierRoleAssignments20260923000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 피해 계정 조회: neture active supplier membership 있으나 supplier role_assignment 없음
    const affected = await queryRunner.query(`
      SELECT sm.user_id, sm.role AS sm_role, sm.approved_by,
             u.email, u.name, u.phone,
             u."businessInfo"->>'businessName' AS biz_name,
             u."businessInfo"->>'businessNumber' AS biz_number
      FROM service_memberships sm
      JOIN users u ON u.id = sm.user_id
      WHERE sm.service_key = 'neture'
        AND sm.status = 'active'
        AND sm.role = 'supplier'
        AND NOT EXISTS (
          SELECT 1 FROM role_assignments ra
          WHERE ra.user_id = sm.user_id
            AND ra.role IN ('supplier', 'neture:supplier')
            AND ra.is_active = true
        )
    `);

    console.log(`[Migration] Found ${affected.length} affected neture supplier account(s) missing role_assignment`);

    for (const row of affected) {
      const { user_id, sm_role, approved_by } = row;
      const assignedBy = approved_by || null;

      // role_assignments에 supplier role 삽입 (ON CONFLICT 방어)
      await queryRunner.query(`
        INSERT INTO role_assignments
          (user_id, role, assigned_by, is_active, valid_from, created_at, updated_at)
        VALUES ($1, $2, $3, true, NOW(), NOW(), NOW())
        ON CONFLICT ON CONSTRAINT "unique_active_role_per_user" DO UPDATE SET updated_at = NOW()
      `, [user_id, sm_role, assignedBy]);

      console.log(`[Migration] role_assignment created: user=${row.email} role=${sm_role}`);
    }

    // 2. supplier role은 있으나 neture_suppliers row가 없는 계정 복구
    const missingSuppliers = await queryRunner.query(`
      SELECT u.id AS user_id, u.email, u.name, u.phone,
             u."businessInfo"->>'businessName' AS biz_name,
             sm.approved_by
      FROM service_memberships sm
      JOIN users u ON u.id = sm.user_id
      WHERE sm.service_key = 'neture'
        AND sm.status = 'active'
        AND sm.role = 'supplier'
        AND NOT EXISTS (
          SELECT 1 FROM neture_suppliers ns WHERE ns.user_id = sm.user_id
        )
    `);

    console.log(`[Migration] Found ${missingSuppliers.length} supplier(s) missing neture_suppliers row`);

    for (const row of missingSuppliers) {
      const { user_id, email, name, phone, biz_name, approved_by } = row;
      const slug = `supplier-${user_id.substring(0, 8)}`;
      const representativeName = name || null;
      const contactEmail = email || null;
      const contactPhone = phone || null;

      const [inserted] = await queryRunner.query(`
        INSERT INTO neture_suppliers
          (user_id, slug, contact_email, contact_phone, representative_name,
           status, approved_by, approved_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'PENDING', $6, NULL, NOW(), NOW())
        ON CONFLICT (user_id) DO NOTHING
        RETURNING id
      `, [user_id, slug, contactEmail, contactPhone, representativeName, approved_by || null]);

      if (inserted?.id && biz_name) {
        const orgCode = `neture-${slug}`;
        const [org] = await queryRunner.query(`
          INSERT INTO organizations (name, code, type, is_active, created_at, updated_at)
          VALUES ($1, $2, 'supplier', true, NOW(), NOW())
          ON CONFLICT (code) DO UPDATE SET is_active = true, updated_at = NOW()
          RETURNING id
        `, [biz_name, orgCode]);

        if (org?.id) {
          await queryRunner.query(`
            UPDATE neture_suppliers
            SET organization_id = $1
            WHERE id = $2 AND organization_id IS NULL
          `, [org.id, inserted.id]);
        }
      }

      console.log(`[Migration] neture_suppliers created: user=${email} slug=${slug}`);
    }

    console.log('[Migration] FixNetureSupplierRoleAssignments complete');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // 복구 마이그레이션 — rollback은 의도적으로 no-op (데이터 삭제 위험)
    console.log('[Migration] FixNetureSupplierRoleAssignments down — no-op (data recovery migration)');
  }
}
