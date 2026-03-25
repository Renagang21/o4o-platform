import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-BARCODE-SOURCE-DISTINCTION-V1
 *
 * product_masters에 barcode_source 컬럼 추가
 * GTIN = 공급자 제공 바코드, INTERNAL = 시스템 자동 생성
 */
export class AddBarcodeSourceToProductMasters1711382400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_masters
        ADD COLUMN barcode_source VARCHAR(20) NOT NULL DEFAULT 'GTIN'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_masters DROP COLUMN IF EXISTS barcode_source
    `);
  }
}
