import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-APPLY-V1 (additive)
 * 설계: docs/design/O4O-HEALTH-FUNCTIONAL-FOOD-CANDIDATE-DESCRIPTION-DRAFT-STORAGE-V1.md
 *
 * ProductMaster 가 없는 ProductCandidate 기반 AI 매장 설명 draft 저장소를 additive 로 생성한다.
 * (건강기능식품처럼 master 부재로 shared_product_descriptions[master_id NOT NULL] 를 못 쓰는 후보용)
 *
 * 불변 보장 (이 migration 이 하지 않는 것):
 *   - product_masters / product_identifiers / product_candidates / shared_product_descriptions
 *     기존 데이터·구조 변경하지 않음. 백필하지 않음(신규 빈 테이블).
 *
 * 정책:
 *   - candidate_id → product_candidates(id) ON DELETE CASCADE
 *   - review_status / draft_type 은 varchar (application-level union, enum migration 회피)
 *   - 동일 (candidate_id, draft_type, language) 활성 1개 — partial unique index (멱등 upsert 축)
 */
export class CreateProductCandidateDescriptionDrafts20261204000000 implements MigrationInterface {
  name = 'CreateProductCandidateDescriptionDrafts20261204000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_candidate_description_drafts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        candidate_id UUID NOT NULL
          REFERENCES product_candidates(id) ON DELETE CASCADE,

        source_label VARCHAR(128) NOT NULL,
        source_identifier_value VARCHAR(255),
        draft_type VARCHAR(64) NOT NULL,
        language VARCHAR(16) NOT NULL DEFAULT 'ko',

        title TEXT,
        summary TEXT,
        content_json JSONB NOT NULL,
        content_html TEXT,
        seed_json JSONB NOT NULL,
        guard_result JSONB NOT NULL,

        review_status VARCHAR(32) NOT NULL DEFAULT 'needs_review',
        review_flags TEXT[] NOT NULL DEFAULT '{}',

        ai_provider VARCHAR(64),
        ai_model VARCHAR(128),
        ai_policy_scope VARCHAR(128),
        ai_cost_estimate NUMERIC(12,6),

        generated_at TIMESTAMP,
        reviewed_by UUID,
        reviewed_at TIMESTAMP,

        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_pcdd_candidate ON product_candidate_description_drafts (candidate_id) WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_pcdd_source_label_review_status ON product_candidate_description_drafts (source_label, review_status) WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_pcdd_review_status_created_at ON product_candidate_description_drafts (review_status, created_at) WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_pcdd_source_identifier ON product_candidate_description_drafts (source_identifier_value) WHERE deleted_at IS NULL`,
    );

    // 멱등 upsert 축: 활성 draft 는 (candidate, draft_type, language) 당 1개
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_pcdd_candidate_draft_type_language_active
      ON product_candidate_description_drafts (candidate_id, draft_type, language)
      WHERE deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // additive 테이블 제거(index/FK 동반 drop). product_candidates 무변경.
    await queryRunner.query(`DROP TABLE IF EXISTS product_candidate_description_drafts CASCADE`);
  }
}
