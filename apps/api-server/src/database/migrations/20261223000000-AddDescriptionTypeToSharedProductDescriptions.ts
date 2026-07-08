import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PRODUCT-DESCRIPTION-TYPE-IMPLEMENTATION-V1 (additive)
 * Baseline: docs/baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1.md (F12)
 *
 * shared_product_descriptions 에 description_type 축 도입 (Baseline Freeze #2).
 *   값: B2B | B2C | STORE | SUPPLIER_STORE (varchar, DB enum 아님)
 *   기존 전량 → 'STORE' 백필 (ADD COLUMN DEFAULT 로 원자적 backfill, NOT NULL).
 *
 * canonical 유일성 확장 (Freeze #2):
 *   기존  uniq_..._canonical_per_master        ON (master_id)               WHERE status='canonical' AND deleted_at IS NULL
 *   변경  uniq_..._canonical_per_master_type   ON (master_id, description_type) WHERE status='canonical' AND deleted_at IS NULL
 *   → 같은 master 에 STORE/SUPPLIER_STORE/B2B/B2C canonical 각 1개 가능.
 *
 * 불변 보장 (Freeze #6): product_masters 무변경. FK 방향 = SPD.master_id → product_masters.id 그대로.
 *
 * 안전장치: 인덱스 교체 전, (master_id, description_type) 기준 canonical 중복이 있으면 **중단**한다
 *   (무리한 자동 삭제 금지). 기존 (master_id) partial unique 가 보장하므로 정상 상태에서는 발생 불가.
 */
export class AddDescriptionTypeToSharedProductDescriptions20261223000000 implements MigrationInterface {
  name = 'AddDescriptionTypeToSharedProductDescriptions20261223000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. description_type 추가 — DEFAULT 'STORE' 로 기존 전량 원자적 백필 + NOT NULL + 향후 insert 안전
    await queryRunner.query(`
      ALTER TABLE shared_product_descriptions
        ADD COLUMN IF NOT EXISTS description_type VARCHAR(32) NOT NULL DEFAULT 'STORE'
    `);

    // 2. 안전 검사 — (master_id, description_type) canonical 중복이 있으면 중단 (자동 삭제 금지)
    const dup: Array<{ master_id: string; description_type: string; c: string }> = await queryRunner.query(`
      SELECT master_id, description_type, count(*)::text AS c
        FROM shared_product_descriptions
       WHERE status = 'canonical' AND deleted_at IS NULL
       GROUP BY master_id, description_type
      HAVING count(*) > 1
       LIMIT 5
    `);
    if (dup.length > 0) {
      throw new Error(
        `[Migration] (master_id, description_type) canonical 중복 발견 → 중단. 수동 정비 필요: ${JSON.stringify(dup)}`,
      );
    }

    // 3. canonical partial unique 교체: (master_id) → (master_id, description_type)
    await queryRunner.query(`DROP INDEX IF EXISTS uniq_shared_product_descriptions_canonical_per_master`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX uniq_shared_product_descriptions_canonical_per_master_type
        ON shared_product_descriptions (master_id, description_type)
       WHERE status = 'canonical' AND deleted_at IS NULL
    `);

    // 4. 조회 필터용 보조 인덱스 (master_id, description_type)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_shared_product_descriptions_master_desctype
        ON shared_product_descriptions (master_id, description_type)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_shared_product_descriptions_master_desctype`);
    await queryRunner.query(`DROP INDEX IF EXISTS uniq_shared_product_descriptions_canonical_per_master_type`);
    // 원복: (master_id) partial unique 재생성 (전량 STORE 이므로 무결)
    await queryRunner.query(`
      CREATE UNIQUE INDEX uniq_shared_product_descriptions_canonical_per_master
        ON shared_product_descriptions (master_id)
       WHERE status = 'canonical' AND deleted_at IS NULL
    `);
    await queryRunner.query(`ALTER TABLE shared_product_descriptions DROP COLUMN IF EXISTS description_type`);
  }
}
