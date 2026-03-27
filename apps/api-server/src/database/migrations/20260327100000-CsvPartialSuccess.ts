/**
 * WO-O4O-NETURE-CSV-PARTIAL-SUCCESS-V1
 *
 * CSV Import 부분 성공 지원:
 * - Batch: PARTIAL 상태 + applied_rows 컬럼
 * - Row: apply_status + apply_error 컬럼
 */
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CsvPartialSuccess1711500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Batch status enum에 PARTIAL 추가
    await queryRunner.query(`
      ALTER TYPE supplier_csv_import_batch_status_enum ADD VALUE IF NOT EXISTS 'PARTIAL'
    `);

    // 2. Batch에 applied_rows 컬럼 추가
    await queryRunner.query(`
      ALTER TABLE supplier_csv_import_batches
        ADD COLUMN IF NOT EXISTS applied_rows INT NOT NULL DEFAULT 0
    `);

    // 3. Row에 apply 단계 추적 컬럼 추가
    await queryRunner.query(`
      ALTER TABLE supplier_csv_import_rows
        ADD COLUMN IF NOT EXISTS apply_status VARCHAR(10),
        ADD COLUMN IF NOT EXISTS apply_error TEXT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE supplier_csv_import_rows
        DROP COLUMN IF EXISTS apply_error,
        DROP COLUMN IF EXISTS apply_status
    `);
    await queryRunner.query(`
      ALTER TABLE supplier_csv_import_batches
        DROP COLUMN IF EXISTS applied_rows
    `);
    // Note: ALTER TYPE ... DROP VALUE is not supported in PostgreSQL
  }
}
