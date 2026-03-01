import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-B2B-CSV-INGEST-PIPELINE-V1
 *
 * CSV 대량 유입 Staging 테이블 생성
 *
 * 1. supplier_csv_import_batches — 공급자 CSV 업로드 batch
 * 2. supplier_csv_import_rows — batch 내 개별 row (검증 결과 포함)
 *
 * 핵심 원칙: CSV는 Offer 생성 도구. Master는 MFDS 검증 기반으로만 생성.
 */
export class CsvImportBatchTables20260301300000 implements MigrationInterface {
  name = 'CsvImportBatchTables20260301300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ================================================================
    // Phase 1: Enum 타입 생성
    // ================================================================

    await queryRunner.query(`
      CREATE TYPE supplier_csv_import_batch_status_enum
        AS ENUM ('UPLOADED', 'VALIDATING', 'READY', 'APPLIED', 'FAILED')
    `);

    await queryRunner.query(`
      CREATE TYPE supplier_csv_import_row_validation_enum
        AS ENUM ('PENDING', 'VALID', 'REJECTED')
    `);

    await queryRunner.query(`
      CREATE TYPE supplier_csv_import_row_action_enum
        AS ENUM ('LINK_EXISTING', 'CREATE_MASTER', 'REJECT')
    `);

    // ================================================================
    // Phase 2: supplier_csv_import_batches 테이블
    // ================================================================

    await queryRunner.query(`
      CREATE TABLE supplier_csv_import_batches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        supplier_id UUID NOT NULL
          REFERENCES neture_suppliers(id) ON DELETE CASCADE,

        uploaded_by UUID NOT NULL,
        file_name VARCHAR(255),

        total_rows INT NOT NULL DEFAULT 0,
        valid_rows INT NOT NULL DEFAULT 0,
        rejected_rows INT NOT NULL DEFAULT 0,

        status supplier_csv_import_batch_status_enum NOT NULL DEFAULT 'UPLOADED',

        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        applied_at TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_csv_import_batches_supplier
        ON supplier_csv_import_batches (supplier_id)
    `);

    // ================================================================
    // Phase 3: supplier_csv_import_rows 테이블
    // ================================================================

    await queryRunner.query(`
      CREATE TABLE supplier_csv_import_rows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        batch_id UUID NOT NULL
          REFERENCES supplier_csv_import_batches(id) ON DELETE CASCADE,

        row_number INT NOT NULL,
        raw_json JSONB NOT NULL,

        parsed_barcode VARCHAR(14),
        parsed_supply_price INT,
        parsed_distribution_type VARCHAR(10),

        validation_status supplier_csv_import_row_validation_enum NOT NULL DEFAULT 'PENDING',
        validation_error VARCHAR(255),

        master_id UUID,
        action_type supplier_csv_import_row_action_enum,

        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_csv_import_rows_batch
        ON supplier_csv_import_rows (batch_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_csv_import_rows_barcode
        ON supplier_csv_import_rows (parsed_barcode)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS supplier_csv_import_rows CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS supplier_csv_import_batches CASCADE`);

    await queryRunner.query(`DROP TYPE IF EXISTS supplier_csv_import_row_action_enum CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS supplier_csv_import_row_validation_enum CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS supplier_csv_import_batch_status_enum CASCADE`);
  }
}
