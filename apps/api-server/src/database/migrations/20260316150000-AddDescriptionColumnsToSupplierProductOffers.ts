import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * supplier_product_offers 테이블에 B2C/B2B 설명 컬럼 추가.
 * Entity에 정의되어 있으나 프로덕션 DB에 누락된 4개 컬럼.
 */
export class AddDescriptionColumnsToSupplierProductOffers1710590400000 implements MigrationInterface {
  name = 'AddDescriptionColumnsToSupplierProductOffers1710590400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // supplier_product_offers 테이블 존재 확인
    const tableExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'supplier_product_offers'
    `);
    if (tableExists.length === 0) return;

    // 각 컬럼 존재 여부 확인 후 추가 (idempotent)
    const columns = [
      'consumer_short_description',
      'consumer_detail_description',
      'business_short_description',
      'business_detail_description',
    ];

    for (const col of columns) {
      const colExists = await queryRunner.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'supplier_product_offers' AND column_name = $1
      `, [col]);

      if (colExists.length === 0) {
        await queryRunner.query(
          `ALTER TABLE "supplier_product_offers" ADD COLUMN "${col}" text`,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const columns = [
      'consumer_short_description',
      'consumer_detail_description',
      'business_short_description',
      'business_detail_description',
    ];

    for (const col of columns) {
      await queryRunner.query(
        `ALTER TABLE "supplier_product_offers" DROP COLUMN IF EXISTS "${col}"`,
      );
    }
  }
}
