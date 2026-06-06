import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PRODUCT-DRUG-EXTENSION-PERSISTENCE-V1 (additive)
 * Baseline: docs/baseline/O4O-PRODUCT-CORE-BASELINE-V1.md §9, §10
 *
 * product_drug_extensions (ProductMaster 1:1) 생성 — 의약품 상세/검증/출처/정책 영속.
 *
 * 불변 보장: product_masters / product_identifiers / product_candidates 무변경.
 *
 * 백필 (보수적):
 *   - drug_category ∈ {otc, rx, quasi_drug, drug_unspecified} 인 ProductMaster 에 extension 생성.
 *   - 비의약품/null 은 생성하지 않음.
 *   - 정책 기본값: pharmacy_only=true, customer_display_allowed=false, online_sale_allowed=false,
 *     tablet_display_allowed='limited', public_display_policy='blocked',
 *     advertising_review_status = (rx → 'blocked', 그 외 → 'needs_review'),
 *     verification_status='pending_review'.
 *   - online_sale/customer_display 를 true 로 백필하지 않는다.
 */
export class CreateProductDrugExtensions20260606040000 implements MigrationInterface {
  name = 'CreateProductDrugExtensions20260606040000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE product_drug_extensions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        product_master_id UUID NOT NULL UNIQUE
          REFERENCES product_masters(id) ON DELETE CASCADE,

        drug_category VARCHAR(32) NOT NULL,

        verification_status VARCHAR(32) NOT NULL DEFAULT 'pending_review',
        reviewer_type VARCHAR(32),
        reviewed_by UUID,
        reviewed_at TIMESTAMP,
        review_note TEXT,

        drug_code VARCHAR(64),
        insurance_code VARCHAR(64),
        mfds_code VARCHAR(64),
        atc_code VARCHAR(64),
        approval_number VARCHAR(128),
        approval_date DATE,
        regulatory_status VARCHAR(64),

        ingredient_summary TEXT,
        active_ingredients JSONB,
        dosage_form VARCHAR(100),
        strength VARCHAR(100),
        package_unit VARCHAR(64),
        package_quantity VARCHAR(64),
        manufacturer_name VARCHAR(255),

        efficacy_text TEXT,
        dosage_text TEXT,
        caution_text TEXT,
        storage_text TEXT,
        contraindication_text TEXT,

        data_source VARCHAR(128),
        mfds_source_url TEXT,
        source_updated_at TIMESTAMP,
        efficacy_source VARCHAR(128),
        dosage_source VARCHAR(128),
        caution_source VARCHAR(128),
        storage_source VARCHAR(128),

        pharmacy_only BOOLEAN NOT NULL DEFAULT TRUE,
        customer_display_allowed BOOLEAN NOT NULL DEFAULT FALSE,
        tablet_display_allowed VARCHAR(32) NOT NULL DEFAULT 'limited',
        online_sale_allowed BOOLEAN NOT NULL DEFAULT FALSE,
        advertising_review_status VARCHAR(32) NOT NULL DEFAULT 'needs_review',
        public_display_policy VARCHAR(32) NOT NULL DEFAULT 'blocked',

        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_product_drug_extensions_product_master_id ON product_drug_extensions (product_master_id)`);
    await queryRunner.query(`CREATE INDEX idx_product_drug_extensions_drug_category ON product_drug_extensions (drug_category)`);
    await queryRunner.query(`CREATE INDEX idx_product_drug_extensions_verification_status ON product_drug_extensions (verification_status)`);
    await queryRunner.query(`CREATE INDEX idx_product_drug_extensions_drug_code ON product_drug_extensions (drug_code)`);
    await queryRunner.query(`CREATE INDEX idx_product_drug_extensions_insurance_code ON product_drug_extensions (insurance_code)`);
    await queryRunner.query(`CREATE INDEX idx_product_drug_extensions_mfds_code ON product_drug_extensions (mfds_code)`);
    await queryRunner.query(`CREATE INDEX idx_product_drug_extensions_ad_review_status ON product_drug_extensions (advertising_review_status)`);
    await queryRunner.query(`CREATE INDEX idx_product_drug_extensions_deleted_at ON product_drug_extensions (deleted_at)`);

    // 보수 백필 — drug_category 가 의약품류인 master 에 extension 생성 (정책 차단 기본값)
    await queryRunner.query(`
      INSERT INTO product_drug_extensions (
        product_master_id, drug_category,
        verification_status, pharmacy_only, customer_display_allowed,
        tablet_display_allowed, online_sale_allowed, advertising_review_status, public_display_policy
      )
      SELECT
        pm.id,
        pm.drug_category,
        'pending_review',
        TRUE,
        FALSE,
        'limited',
        FALSE,
        CASE WHEN pm.drug_category = 'rx' THEN 'blocked' ELSE 'needs_review' END,
        'blocked'
      FROM product_masters pm
      WHERE pm.drug_category IN ('otc', 'rx', 'quasi_drug', 'drug_unspecified')
        AND NOT EXISTS (
          SELECT 1 FROM product_drug_extensions e WHERE e.product_master_id = pm.id
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS product_drug_extensions CASCADE`);
  }
}
