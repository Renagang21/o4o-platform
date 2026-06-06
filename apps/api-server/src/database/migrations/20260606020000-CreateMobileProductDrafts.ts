import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-MOBILE-PRODUCT-DRAFT-TO-CANDIDATE-V1 (Phase 4 — additive)
 * Baseline: docs/baseline/O4O-PRODUCT-CORE-BASELINE-V1.md §8
 *
 * mobile_product_drafts 테이블을 additive 로 생성한다 (신규 빈 테이블, 백필 없음).
 *
 * 불변 보장:
 *   - ProductMaster / product_identifiers / product_candidates 기존 데이터·구조 변경하지 않음
 *
 * 정책:
 *   - 전역 UNIQUE 없음 (같은 상품 다회 촬영 허용). 중복은 검토 큐/service logic.
 *   - candidate_id → product_candidates(id) ON DELETE SET NULL
 */
export class CreateMobileProductDrafts20260606020000 implements MigrationInterface {
  name = 'CreateMobileProductDrafts20260606020000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE mobile_product_drafts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        service_key VARCHAR(50),
        organization_id UUID,
        store_id UUID,
        submitted_by UUID,
        source_app VARCHAR(32),

        draft_status VARCHAR(32) NOT NULL DEFAULT 'draft',

        candidate_id UUID
          REFERENCES product_candidates(id) ON DELETE SET NULL,

        identifier_type VARCHAR(40),
        identifier_value VARCHAR(128),
        normalized_identifier_value VARCHAR(128),

        captured_name VARCHAR(255),
        captured_brand VARCHAR(255),
        captured_manufacturer VARCHAR(255),
        captured_category VARCHAR(255),
        captured_spec VARCHAR(255),
        captured_unit VARCHAR(64),
        captured_price NUMERIC(12,2),
        captured_currency VARCHAR(8),

        thumbnail_image_url TEXT,
        image_urls JSONB,
        memo TEXT,
        raw_payload JSONB,

        submitted_at TIMESTAMP,
        converted_at TIMESTAMP,
        archived_at TIMESTAMP,

        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_mobile_product_drafts_status ON mobile_product_drafts (draft_status)`);
    await queryRunner.query(`CREATE INDEX idx_mobile_product_drafts_service_key ON mobile_product_drafts (service_key)`);
    await queryRunner.query(`CREATE INDEX idx_mobile_product_drafts_organization_id ON mobile_product_drafts (organization_id)`);
    await queryRunner.query(`CREATE INDEX idx_mobile_product_drafts_store_id ON mobile_product_drafts (store_id)`);
    await queryRunner.query(`CREATE INDEX idx_mobile_product_drafts_submitted_by ON mobile_product_drafts (submitted_by)`);
    await queryRunner.query(`CREATE INDEX idx_mobile_product_drafts_normalized_identifier ON mobile_product_drafts (normalized_identifier_value)`);
    await queryRunner.query(`CREATE INDEX idx_mobile_product_drafts_candidate_id ON mobile_product_drafts (candidate_id)`);
    await queryRunner.query(`CREATE INDEX idx_mobile_product_drafts_created_at ON mobile_product_drafts (created_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // additive 테이블 제거 (index/FK 동반 drop). product_candidates 등 무변경.
    await queryRunner.query(`DROP TABLE IF EXISTS mobile_product_drafts CASCADE`);
  }
}
