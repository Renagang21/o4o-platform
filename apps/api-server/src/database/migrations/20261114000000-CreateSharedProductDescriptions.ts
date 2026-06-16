import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PRODUCT-DESCRIPTION-SHARED-CANDIDATE-STORAGE-V1 (additive)
 * 정책: docs/investigations/IR-O4O-PRODUCT-DESCRIPTION-SHARED-ASSET-AND-CANONICAL-DESCRIPTION-POLICY-V1.md
 *
 * shared_product_descriptions 공용 상품설명 후보 풀 테이블을 additive 로 생성한다.
 *
 * 불변 보장 (이 migration 이 하지 않는 것):
 *   - product_masters / product_ai_contents / supplier_product_offers /
 *     store_local_products 기존 데이터·구조 변경하지 않음
 *   - 백필하지 않음 (신규 빈 테이블)
 *
 * 정책:
 *   - master_id → product_masters(id) ON DELETE CASCADE
 *   - canonical 은 master 당 1개만 — partial unique index 로 DB 레벨 보장
 *   - status / source_type 은 varchar (application-level union, enum migration 회피)
 */
export class CreateSharedProductDescriptions20261114000000 implements MigrationInterface {
  name = 'CreateSharedProductDescriptions20261114000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE shared_product_descriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        master_id UUID NOT NULL
          REFERENCES product_masters(id) ON DELETE CASCADE,

        content TEXT NOT NULL,
        summary TEXT,

        source_type VARCHAR(32) NOT NULL,
        source_ref_id UUID,

        status VARCHAR(32) NOT NULL DEFAULT 'candidate',
        language VARCHAR(16) DEFAULT 'ko',
        quality_score NUMERIC(5,4),

        curated_by UUID,
        curated_at TIMESTAMP,
        created_by UUID,
        updated_by UUID,

        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_shared_product_descriptions_master ON shared_product_descriptions (master_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_shared_product_descriptions_master_status ON shared_product_descriptions (master_id, status)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_shared_product_descriptions_source_type ON shared_product_descriptions (source_type)`,
    );

    // canonical 1개/master 보장 (soft-delete 제외)
    await queryRunner.query(`
      CREATE UNIQUE INDEX uniq_shared_product_descriptions_canonical_per_master
      ON shared_product_descriptions (master_id)
      WHERE status = 'canonical' AND deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // additive 테이블 제거 (index/FK 동반 drop). product_masters 무변경.
    await queryRunner.query(`DROP TABLE IF EXISTS shared_product_descriptions CASCADE`);
  }
}
