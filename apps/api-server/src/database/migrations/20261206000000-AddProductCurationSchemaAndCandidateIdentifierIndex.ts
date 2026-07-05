import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-MEDICAL-DEVICE-GRADE4-HARD-DELETE-EXECUTE-WITH-COUNT-REPORT-V1 (1/2 — DDL)
 *
 * 4등급 의료기기 삭제(2/2 DML migration)를 위한 스키마 준비. DDL 전용 · 빠르게 커밋.
 *
 * 하는 것:
 *   1. product_candidates.matched_identifier_id 인덱스 생성 (성능 필수 선행)
 *      - product_masters 삭제 → product_identifiers CASCADE 삭제 → product_candidates
 *        (matched_identifier_id ON DELETE SET NULL) 로의 2차 캐스케이드가
 *        미인덱스 상태에서 398k 행 seq scan 을 identifier 삭제마다 반복(755개 master 삭제가
 *        ~25분). 이 인덱스로 삭제 시간이 초 단위로 단축됨(실측: 미인덱스 >25분 → 인덱스 1.5초).
 *   2. product_masters 정제용 컬럼 4개 추가 (additive, nullable — ADD COLUMN 은 metadata-only, 순간)
 *   3. product_master_cleanup_audits 삭제 감사 테이블 생성 (product_masters FK 없음 — 삭제 후 snapshot 보존)
 *
 * 락 전략: DDL 만 담아 즉시 커밋 → product_masters ACCESS EXCLUSIVE 는 순간만 점유.
 *          대량 backfill/delete(ROW EXCLUSIVE, 읽기 무영향)는 2/2 migration 으로 분리.
 *
 * 불변 보장: 기존 데이터·구조 변경 없음(순수 additive). backfill/삭제는 이 migration 이 하지 않음.
 */
export class AddProductCurationSchemaAndCandidateIdentifierIndex20261206000000
  implements MigrationInterface
{
  name = 'AddProductCurationSchemaAndCandidateIdentifierIndex20261206000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. FK 캐스케이드 성능 인덱스 (product_candidates → product_identifiers SET NULL 축)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_pc_matched_identifier_id ON product_candidates (matched_identifier_id)`,
    );

    // 2. 정제용 컬럼 (additive, nullable, 멱등)
    await queryRunner.query(`
      ALTER TABLE product_masters
        ADD COLUMN IF NOT EXISTS medical_device_grade VARCHAR(8),
        ADD COLUMN IF NOT EXISTS product_data_status VARCHAR(32),
        ADD COLUMN IF NOT EXISTS product_data_curation_reason TEXT,
        ADD COLUMN IF NOT EXISTS product_data_curated_at TIMESTAMP
    `);

    // 3. 삭제 감사 테이블 (product_masters 로의 FK 없음)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_master_cleanup_audits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cleanup_key VARCHAR(128) NOT NULL,
        action VARCHAR(32) NOT NULL,
        product_master_id UUID NOT NULL,
        regulatory_type VARCHAR(50),
        mfds_product_id VARCHAR(100),
        barcode VARCHAR(14),
        name VARCHAR(255),
        medical_device_grade VARCHAR(8),
        snapshot JSONB NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_pmca_cleanup_key_action ON product_master_cleanup_audits (cleanup_key, action)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_pmca_master ON product_master_cleanup_audits (product_master_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS product_master_cleanup_audits`);
    await queryRunner.query(`
      ALTER TABLE product_masters
        DROP COLUMN IF EXISTS product_data_curated_at,
        DROP COLUMN IF EXISTS product_data_curation_reason,
        DROP COLUMN IF EXISTS product_data_status,
        DROP COLUMN IF EXISTS medical_device_grade
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pc_matched_identifier_id`);
  }
}
