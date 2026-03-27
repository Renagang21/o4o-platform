/**
 * WO-O4O-NETURE-IMPORT-PRODUCT-TRACE-V1
 *
 * CSV Import Row → Product/Offer 연결 추적:
 * - Row: offer_id 컬럼 추가 (master_id는 이미 존재)
 */
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ImportProductTrace1711501100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE supplier_csv_import_rows
        ADD COLUMN IF NOT EXISTS offer_id UUID
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE supplier_csv_import_rows
        DROP COLUMN IF EXISTS offer_id
    `);
  }
}
