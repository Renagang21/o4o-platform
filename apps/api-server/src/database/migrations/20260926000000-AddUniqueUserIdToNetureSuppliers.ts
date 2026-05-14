/**
 * WO-O4O-NETURE-SUPPLIER-USERID-UNIQUE-FIX-V1
 *
 * 배경:
 *   approveRegistration()에서 neture_suppliers INSERT 시
 *   ON CONFLICT (user_id) DO NOTHING 사용 중이지만,
 *   user_id에 UNIQUE 제약이 없어 PostgreSQL 42P10 에러 발생.
 *   (there is no unique or exclusion constraint matching the ON CONFLICT specification)
 *
 *   20260925000000-CleanupNetureOrphanSuppliers 마이그레이션이
 *   FK(ON DELETE CASCADE)만 추가하고 UNIQUE는 누락됨.
 *
 * 이 마이그레이션이 하는 것:
 *   1. 중복 user_id 행 있는지 확인 (있으면 실패 — 수동 처리 필요)
 *   2. neture_suppliers.user_id에 UNIQUE 제약 추가
 *      (nullable 허용 — NULL은 UNIQUE 제약에서 제외됨)
 */
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueUserIdToNetureSuppliers20260926000000 implements MigrationInterface {
  name = 'AddUniqueUserIdToNetureSuppliers20260926000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 중복 user_id 검사 (NULL 제외)
    const duplicates: Array<{ user_id: string; cnt: string }> = await queryRunner.query(`
      SELECT user_id, COUNT(*)::int AS cnt
      FROM neture_suppliers
      WHERE user_id IS NOT NULL
      GROUP BY user_id
      HAVING COUNT(*) > 1
    `);

    if (duplicates.length > 0) {
      throw new Error(
        `[AddUniqueUserIdToNetureSuppliers] Cannot add UNIQUE constraint: duplicate user_id rows exist. ` +
        `Affected user_ids: ${duplicates.map((d) => d.user_id).join(', ')}`
      );
    }

    // 2. UNIQUE 제약이 이미 있는지 확인
    const existing: Array<{ constraint_name: string }> = await queryRunner.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'neture_suppliers'
        AND constraint_name = 'uq_neture_suppliers_user_id'
        AND constraint_type = 'UNIQUE'
    `);

    if (existing.length > 0) {
      console.log('[AddUniqueUserIdToNetureSuppliers] UNIQUE constraint already exists — skipped.');
      return;
    }

    // 3. UNIQUE 제약 추가
    await queryRunner.query(`
      ALTER TABLE neture_suppliers
      ADD CONSTRAINT uq_neture_suppliers_user_id UNIQUE (user_id)
    `);

    console.log('[AddUniqueUserIdToNetureSuppliers] ✅ UNIQUE constraint uq_neture_suppliers_user_id added to neture_suppliers.user_id.');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE neture_suppliers
      DROP CONSTRAINT IF EXISTS uq_neture_suppliers_user_id
    `);
    console.log('[AddUniqueUserIdToNetureSuppliers] down: UNIQUE constraint removed.');
  }
}
