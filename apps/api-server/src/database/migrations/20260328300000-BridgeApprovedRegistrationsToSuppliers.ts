import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-NETURE-RBAC-APPROVAL-PRODUCT-FLOW-INTEGRATION-V1
 *
 * 가입 승인(service_memberships.status='active')이 되었지만
 * neture_suppliers 레코드가 없는 supplier 사용자를 보정한다.
 *
 * 또한 unprefixed 'supplier' role_assignments를 prefixed 'neture:supplier'로 보정.
 */
export class BridgeApprovedRegistrationsToSuppliers20260328300000 implements MigrationInterface {
  name = 'BridgeApprovedRegistrationsToSuppliers20260328300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 승인됨(active) + supplier role + neture_suppliers 없는 사용자 찾기 → neture_suppliers 생성
    const missingSuppliers = await queryRunner.query(`
      SELECT u.id AS user_id, u.email, u.name, u.phone
      FROM users u
      JOIN service_memberships sm ON sm.user_id = u.id
      WHERE sm.service_key = 'neture'
        AND sm.status = 'active'
        AND sm.role = 'supplier'
        AND NOT EXISTS (SELECT 1 FROM neture_suppliers ns WHERE ns.user_id = u.id)
    `);

    console.log(`[BridgeRegistration] Found ${missingSuppliers.length} approved suppliers without neture_suppliers record`);

    for (const user of missingSuppliers) {
      const slug = `supplier-${user.user_id.substring(0, 8)}`;
      await queryRunner.query(
        `INSERT INTO neture_suppliers (user_id, slug, contact_email, contact_phone, representative_name, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'ACTIVE', NOW(), NOW())
         ON CONFLICT (user_id) DO NOTHING`,
        [user.user_id, slug, user.email, user.phone, user.name],
      );
    }

    if (missingSuppliers.length > 0) {
      console.log(`[BridgeRegistration] Created ${missingSuppliers.length} neture_suppliers records`);
    }

    // 2. unprefixed 'supplier' role → prefixed 'neture:supplier' 보정
    const result = await queryRunner.query(`
      INSERT INTO role_assignments (user_id, role, assigned_by, is_active, valid_from, created_at, updated_at)
      SELECT ra.user_id, 'neture:supplier', ra.assigned_by, true, NOW(), NOW(), NOW()
      FROM role_assignments ra
      WHERE ra.role = 'supplier' AND ra.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM role_assignments ra2
          WHERE ra2.user_id = ra.user_id AND ra2.role = 'neture:supplier' AND ra2.is_active = true
        )
      ON CONFLICT (user_id, role, is_active) DO NOTHING
    `);

    const insertedCount = Array.isArray(result) ? result.length : (result as { rowCount?: number }).rowCount ?? 0;
    console.log(`[BridgeRegistration] Added ${insertedCount} prefixed 'neture:supplier' role assignments`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove auto-created suppliers (those with slug pattern 'supplier-XXXXXXXX' and no offers)
    await queryRunner.query(`
      DELETE FROM neture_suppliers
      WHERE slug LIKE 'supplier-%'
        AND NOT EXISTS (SELECT 1 FROM supplier_product_offers spo WHERE spo.supplier_id = neture_suppliers.id)
        AND created_at >= '2026-03-28T00:00:00Z'
    `);
  }
}
