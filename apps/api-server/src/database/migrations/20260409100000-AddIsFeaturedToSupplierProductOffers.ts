import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-RECOMMENDED-TAB-REPLACE-CURATION-WITH-SUPPLIER-HIGHLIGHT-V1
 *
 * supplier_product_offers.is_featured 추가:
 * 공급자가 직접 "추천 노출 희망" 여부를 설정하는 자율 플래그.
 * KPA 약국 허브의 "추천 상품" 탭에서 1순위 정렬 기준으로 사용한다.
 */
export class AddIsFeaturedToSupplierProductOffers20260409100000 implements MigrationInterface {
  name = 'AddIsFeaturedToSupplierProductOffers20260409100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE supplier_product_offers
      ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false
    `);

    // 추천 상품 조회 성능용 partial index
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_spo_is_featured
      ON supplier_product_offers (is_featured)
      WHERE is_featured = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_spo_is_featured`);
    await queryRunner.query(`
      ALTER TABLE supplier_product_offers
      DROP COLUMN IF EXISTS is_featured
    `);
  }
}
