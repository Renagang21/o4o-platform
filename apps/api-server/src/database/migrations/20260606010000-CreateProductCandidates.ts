import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PRODUCT-CANDIDATE-REVIEW-QUEUE-V1 (Phase 3 — additive)
 * Baseline: docs/baseline/O4O-PRODUCT-CORE-BASELINE-V1.md §2, §8
 *
 * product_candidates 검토 큐 테이블을 additive 로 생성한다 (신규 테이블 생성만).
 *
 * 불변 보장 (이 migration 이 하지 않는 것):
 *   - ProductMaster / product_identifiers / supplier_product_offers /
 *     store_product_profiles 기존 데이터·구조 변경하지 않음
 *   - 백필하지 않음 (신규 빈 테이블)
 *
 * 정책:
 *   - 전역 UNIQUE 없음 (후보 큐). 중복 방지는 service logic.
 *   - matched_product_master_id → product_masters(id) ON DELETE SET NULL
 *   - matched_identifier_id → product_identifiers(id) ON DELETE SET NULL
 */
export class CreateProductCandidates20260606010000 implements MigrationInterface {
  name = 'CreateProductCandidates20260606010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE product_candidates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        service_key VARCHAR(50),
        organization_id UUID,

        source_type VARCHAR(32) NOT NULL,
        source_id UUID,
        source_label VARCHAR(128),
        submitted_by UUID,

        candidate_status VARCHAR(32) NOT NULL DEFAULT 'pending',
        match_status VARCHAR(32) NOT NULL DEFAULT 'unmatched',

        matched_product_master_id UUID
          REFERENCES product_masters(id) ON DELETE SET NULL,
        matched_identifier_id UUID
          REFERENCES product_identifiers(id) ON DELETE SET NULL,
        confidence_score NUMERIC(5,4),

        identifier_type VARCHAR(40),
        identifier_value VARCHAR(128),
        normalized_identifier_value VARCHAR(128),

        candidate_name VARCHAR(255),
        candidate_brand VARCHAR(255),
        candidate_manufacturer VARCHAR(255),
        candidate_category VARCHAR(255),
        candidate_spec VARCHAR(255),
        candidate_unit VARCHAR(64),
        candidate_image_url TEXT,
        candidate_price NUMERIC(12,2),
        raw_payload JSONB,

        review_note TEXT,
        reviewed_by UUID,
        reviewed_at TIMESTAMP,

        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_product_candidates_status ON product_candidates (candidate_status)`);
    await queryRunner.query(`CREATE INDEX idx_product_candidates_match_status ON product_candidates (match_status)`);
    await queryRunner.query(`CREATE INDEX idx_product_candidates_source_type ON product_candidates (source_type)`);
    await queryRunner.query(`CREATE INDEX idx_product_candidates_service_key ON product_candidates (service_key)`);
    await queryRunner.query(`CREATE INDEX idx_product_candidates_organization_id ON product_candidates (organization_id)`);
    await queryRunner.query(`CREATE INDEX idx_product_candidates_normalized_identifier ON product_candidates (normalized_identifier_value)`);
    await queryRunner.query(`CREATE INDEX idx_product_candidates_matched_product_master_id ON product_candidates (matched_product_master_id)`);
    await queryRunner.query(`CREATE INDEX idx_product_candidates_created_at ON product_candidates (created_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // additive 테이블 제거 (index/FK 동반 drop). product_masters/product_identifiers 무변경.
    await queryRunner.query(`DROP TABLE IF EXISTS product_candidates CASCADE`);
  }
}
