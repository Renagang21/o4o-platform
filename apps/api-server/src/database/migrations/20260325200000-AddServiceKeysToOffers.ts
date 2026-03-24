/**
 * WO-NETURE-PRODUCT-REGISTRATION-REFACTOR-AND-AI-TAGGING-V1
 *
 * supplier_product_offers.service_keys — 공급자 상품의 서비스 선택 저장
 */
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServiceKeysToOffers20260325200000 implements MigrationInterface {
  name = 'AddServiceKeysToOffers20260325200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE supplier_product_offers
      ADD COLUMN IF NOT EXISTS service_keys TEXT[] DEFAULT '{}'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE supplier_product_offers
      DROP COLUMN IF EXISTS service_keys
    `);
  }
}
