import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PRODUCT-IDENTIFIER-CORE-V1 (Phase 2 — additive)
 * Baseline: docs/baseline/O4O-PRODUCT-CORE-BASELINE-V1.md §5
 *
 * product_identifiers 테이블을 additive 로 도입한다.
 *
 * 불변 보장 (이 migration 이 하지 않는 것):
 *   - product_masters.barcode 컬럼 제거하지 않음
 *   - uq_product_masters_barcode UNIQUE 제거하지 않음
 *   - 기존 product_masters.barcode 값 변경하지 않음 (읽기만)
 *
 * 중복 정책:
 *   - 전역 UNIQUE(normalized_value) 두지 않음 (중복 barcode/비-GTIN 식별자 수용 목적)
 *   - (product_master_id, identifier_type, normalized_value) WHERE deleted_at IS NULL
 *     partial unique index 로만 master 내 중복 방지
 *
 * 백필:
 *   - product_masters.barcode 가 비어있지 않으면 primary 식별자 1건 생성
 *   - idempotent (이미 primary 식별자가 있으면 skip)
 */
export class CreateProductIdentifiers20260606000000 implements MigrationInterface {
  name = 'CreateProductIdentifiers20260606000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ================================================================
    // 1. product_identifiers 테이블 생성 (FK CASCADE)
    // ================================================================
    await queryRunner.query(`
      CREATE TABLE product_identifiers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        product_master_id UUID NOT NULL
          REFERENCES product_masters(id) ON DELETE CASCADE,

        identifier_type VARCHAR(40) NOT NULL,
        identifier_value VARCHAR(128) NOT NULL,
        normalized_value VARCHAR(128) NOT NULL,

        source_type VARCHAR(64),
        source_id UUID,
        source_label VARCHAR(128),
        country VARCHAR(8),

        is_primary BOOLEAN NOT NULL DEFAULT FALSE,
        verification_status VARCHAR(32) NOT NULL DEFAULT 'unverified',
        metadata JSONB,

        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP
      )
    `);

    // ================================================================
    // 2. Index
    // ================================================================
    await queryRunner.query(
      `CREATE INDEX idx_product_identifiers_product_master_id ON product_identifiers (product_master_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_product_identifiers_identifier_type ON product_identifiers (identifier_type)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_product_identifiers_normalized_value ON product_identifiers (normalized_value)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_product_identifiers_type_normalized ON product_identifiers (identifier_type, normalized_value)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_product_identifiers_primary ON product_identifiers (product_master_id, is_primary)`,
    );

    // master 내 (type, normalized) 중복 방지 — 활성 row 한정 partial unique.
    // 전역 UNIQUE 가 아님: 동일 normalized_value 가 서로 다른 master 에 존재 가능.
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_product_identifiers_master_type_normalized
        ON product_identifiers (product_master_id, identifier_type, normalized_value)
        WHERE deleted_at IS NULL
    `);

    // ================================================================
    // 3. 기존 product_masters.barcode → primary 식별자 백필 (idempotent)
    //    - identifier_type: barcode_source='INTERNAL' → INTERNAL_O4O,
    //      숫자 13자리 → EAN13, 그 외 → GTIN (util.inferIdentifierTypeFromBarcode 와 일치)
    //    - normalized_value: 숫자만
    //    - verification_status: INTERNAL → system_generated, 그 외 → imported
    // ================================================================
    await queryRunner.query(`
      INSERT INTO product_identifiers (
        product_master_id, identifier_type, identifier_value, normalized_value,
        source_type, is_primary, verification_status, metadata
      )
      SELECT
        pm.id,
        CASE
          WHEN COALESCE(pm.barcode_source, 'GTIN') = 'INTERNAL' THEN 'INTERNAL_O4O'
          WHEN length(regexp_replace(pm.barcode, '\\D', '', 'g')) = 13 THEN 'EAN13'
          ELSE 'GTIN'
        END,
        pm.barcode,
        regexp_replace(pm.barcode, '\\D', '', 'g'),
        'product_master_backfill',
        TRUE,
        CASE
          WHEN COALESCE(pm.barcode_source, 'GTIN') = 'INTERNAL' THEN 'system_generated'
          ELSE 'imported'
        END,
        jsonb_build_object('originalBarcodeSource', COALESCE(pm.barcode_source, 'GTIN'))
      FROM product_masters pm
      WHERE pm.barcode IS NOT NULL
        AND btrim(pm.barcode) <> ''
        AND regexp_replace(pm.barcode, '\\D', '', 'g') <> ''
        AND NOT EXISTS (
          SELECT 1 FROM product_identifiers pi
          WHERE pi.product_master_id = pm.id
            AND pi.is_primary = TRUE
            AND pi.deleted_at IS NULL
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // additive 테이블 제거 (index 는 테이블과 함께 drop). product_masters 는 무변경.
    await queryRunner.query(`DROP TABLE IF EXISTS product_identifiers CASCADE`);
  }
}
