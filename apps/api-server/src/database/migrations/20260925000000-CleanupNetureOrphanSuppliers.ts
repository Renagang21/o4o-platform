/**
 * WO-O4O-NETURE-MEMBER-DATA-INTEGRITY-CLEANUP-V1
 *
 * 배경:
 *   neture_suppliers 테이블에 users가 없는 고아(orphan) 행이 존재한다.
 *   - user_id IS NULL: 더미/seed 데이터 (farmfresh-korea, health-plus, daily-essentials)
 *   - user_id NOT IN users: users가 삭제된 후 남은 잔재
 *     (pharmabase@nate.com, chojj22@naver.com, ir-* 테스트 계정)
 *
 *   이런 고아 supplier는 운영자 회원 리스트에 보이지 않고,
 *   관리·승인·대시보드 접근 모두 불가능하다.
 *
 * 이 마이그레이션이 하는 것:
 *   1. 고아 neture_suppliers에 연결된 supplier_product_offers 삭제 (cascade 선처리)
 *   2. 고아 neture_suppliers 삭제 (user_id IS NULL OR user_id NOT IN users)
 *   3. FK 제약 추가: neture_suppliers.user_id → users(id) ON DELETE CASCADE
 *      - 이후 users 삭제 시 neture_suppliers 자동 연쇄 삭제
 *   4. 검증: orphan 0건, FK 존재 확인
 *
 * 재발 방지:
 *   FK ON DELETE CASCADE로 users 삭제 시 supplier 자동 정리.
 *   코드 레벨: approveRegistration() 내 service_memberships 존재 필수 검증 유지.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanupNetureOrphanSuppliers20260925000000 implements MigrationInterface {
  name = 'CleanupNetureOrphanSuppliers20260925000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 삭제 대상 확인 (감사 로그)
    const orphans: Array<{ id: string; slug: string; status: string; contact_email: string | null; user_id: string | null }> =
      await queryRunner.query(`
        SELECT id, slug, status, contact_email, user_id
        FROM neture_suppliers
        WHERE user_id IS NULL
           OR user_id NOT IN (SELECT id FROM users)
        ORDER BY status, slug
      `);

    if (orphans.length === 0) {
      console.log('[CleanupNetureOrphanSuppliers] No orphan suppliers found. Nothing to do.');
      return;
    }

    console.log(`[CleanupNetureOrphanSuppliers] Found ${orphans.length} orphan supplier(s):`);
    for (const s of orphans) {
      console.log(`  - slug=${s.slug} | status=${s.status} | contact=${s.contact_email ?? 'NULL'} | user_id=${s.user_id ?? 'NULL'}`);
    }

    const orphanIds = orphans.map((s) => s.id);

    // 2. 연결된 supplier_product_offers 선삭제 (FK cascade 처리)
    const offerResult: Array<{ count: string }> = await queryRunner.query(`
      SELECT COUNT(*)::int AS count
      FROM supplier_product_offers
      WHERE supplier_id = ANY($1::uuid[])
    `, [orphanIds]);

    const offerCount = Number(offerResult[0]?.count ?? 0);
    if (offerCount > 0) {
      console.log(`[CleanupNetureOrphanSuppliers] Deleting ${offerCount} offer(s) linked to orphan suppliers...`);
      await queryRunner.query(`
        DELETE FROM supplier_product_offers
        WHERE supplier_id = ANY($1::uuid[])
      `, [orphanIds]);
    }

    // 3. 고아 neture_suppliers 삭제
    await queryRunner.query(`
      DELETE FROM neture_suppliers
      WHERE id = ANY($1::uuid[])
    `, [orphanIds]);

    console.log(`[CleanupNetureOrphanSuppliers] Deleted ${orphans.length} orphan supplier(s) and ${offerCount} linked offer(s).`);

    // 4. FK 제약 추가: user_id → users(id) ON DELETE CASCADE
    //    nullable: true 유지 — user_id IS NULL은 허용 (관리자 수동 엔트리 여지)
    //    단, 값이 있을 경우 반드시 유효한 users.id 참조 강제
    const fkExists: Array<{ constraint_name: string }> = await queryRunner.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'neture_suppliers'
        AND constraint_name = 'fk_neture_suppliers_user_id'
        AND constraint_type = 'FOREIGN KEY'
    `);

    if (fkExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE neture_suppliers
        ADD CONSTRAINT fk_neture_suppliers_user_id
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
        DEFERRABLE INITIALLY DEFERRED
      `);
      console.log('[CleanupNetureOrphanSuppliers] FK constraint fk_neture_suppliers_user_id added (ON DELETE CASCADE).');
    } else {
      console.log('[CleanupNetureOrphanSuppliers] FK constraint already exists — skipped.');
    }

    // 5. 검증
    const remaining: Array<{ count: string }> = await queryRunner.query(`
      SELECT COUNT(*)::int AS count
      FROM neture_suppliers
      WHERE user_id IS NOT NULL
        AND user_id NOT IN (SELECT id FROM users)
    `);

    const remainCount = Number(remaining[0]?.count ?? 0);
    if (remainCount > 0) {
      throw new Error(`[CleanupNetureOrphanSuppliers] Validation failed: ${remainCount} orphan supplier(s) still exist after cleanup.`);
    }

    console.log('[CleanupNetureOrphanSuppliers] ✅ Validation passed: no orphan suppliers remain.');
    console.log('[CleanupNetureOrphanSuppliers] ✅ FK ON DELETE CASCADE active — future user deletion auto-cascades.');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // FK 제약 제거 (데이터 복구는 수동 처리 필요)
    await queryRunner.query(`
      ALTER TABLE neture_suppliers
      DROP CONSTRAINT IF EXISTS fk_neture_suppliers_user_id
    `);
    console.log('[CleanupNetureOrphanSuppliers] down: FK constraint removed. Deleted orphan data cannot be recovered automatically.');
  }
}
