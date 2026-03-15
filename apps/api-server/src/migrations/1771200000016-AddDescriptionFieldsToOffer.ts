import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-PRODUCT-DESCRIPTION-FIELDS-V1
 *
 * SupplierProductOffer에 B2C/B2B 설명 필드 4개 추가
 */
export class AddDescriptionFieldsToOffer1771200000016 implements MigrationInterface {
  name = 'AddDescriptionFieldsToOffer1771200000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE supplier_product_offers ADD COLUMN IF NOT EXISTS consumer_short_description TEXT NULL`);
    await queryRunner.query(`ALTER TABLE supplier_product_offers ADD COLUMN IF NOT EXISTS consumer_detail_description TEXT NULL`);
    await queryRunner.query(`ALTER TABLE supplier_product_offers ADD COLUMN IF NOT EXISTS business_short_description TEXT NULL`);
    await queryRunner.query(`ALTER TABLE supplier_product_offers ADD COLUMN IF NOT EXISTS business_detail_description TEXT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE supplier_product_offers DROP COLUMN IF EXISTS business_detail_description`);
    await queryRunner.query(`ALTER TABLE supplier_product_offers DROP COLUMN IF EXISTS business_short_description`);
    await queryRunner.query(`ALTER TABLE supplier_product_offers DROP COLUMN IF EXISTS consumer_detail_description`);
    await queryRunner.query(`ALTER TABLE supplier_product_offers DROP COLUMN IF EXISTS consumer_short_description`);
  }
}
