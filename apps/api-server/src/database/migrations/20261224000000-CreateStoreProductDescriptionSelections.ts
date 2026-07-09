import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-HANDLED-PRODUCT-DESCRIPTION-SELECTION-V1 (additive)
 * Baseline: docs/baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1.md (F12)
 *
 * store_product_description_selections — 매장(organization)이 특정 ProductMaster 에 대해
 * 사용할 DESCRIPTION Resource(shared_product_descriptions)를 선택 저장하는 연결 테이블.
 *
 * Freeze #6: ProductMaster 무변경 (Resource FK 신설 금지). 선택 관계는 별도 테이블에 저장.
 * Freeze #5: Product Resource(계층1) 참조만 — 매장 실행 자산(계층2)과 무관.
 *
 * - 경계: organization_id (매장). Boundary Policy 정합.
 * - description_id → shared_product_descriptions.id (계층1 Resource).
 * - 중복 방지: (organization_id, master_id, description_type, description_id) 활성 1개.
 */
export class CreateStoreProductDescriptionSelections20261224000000 implements MigrationInterface {
  name = 'CreateStoreProductDescriptionSelections20261224000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS store_product_description_selections (
        id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id                 UUID NOT NULL,
        master_id                       UUID NOT NULL,
        organization_product_listing_id UUID NULL,
        description_id                  UUID NOT NULL,
        description_type                VARCHAR(32) NOT NULL,
        is_enabled                      BOOLEAN NOT NULL DEFAULT true,
        created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at                      TIMESTAMPTZ NULL
      )
    `);

    // 조회 인덱스 (org + master 단위 조회가 주 경로)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_spds_org_master
        ON store_product_description_selections (organization_id, master_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_spds_listing
        ON store_product_description_selections (organization_product_listing_id)
    `);

    // 중복 방지 — 활성(soft-delete 제외) 동일 선택 1개
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_spds_active
        ON store_product_description_selections (organization_id, master_id, description_type, description_id)
       WHERE deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS store_product_description_selections CASCADE`);
  }
}
