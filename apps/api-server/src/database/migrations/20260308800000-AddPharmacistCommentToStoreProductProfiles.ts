import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-PRODUCT-PAGE-ENHANCEMENT-V1
 *
 * store_product_profiles 테이블에 pharmacist_comment 컬럼 추가.
 * 약사가 상품에 대한 전문 코멘트를 작성할 수 있도록 함.
 */
export class AddPharmacistCommentToStoreProductProfiles1709884800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE store_product_profiles
      ADD COLUMN IF NOT EXISTS pharmacist_comment TEXT;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE store_product_profiles
      DROP COLUMN IF EXISTS pharmacist_comment;
    `);
  }
}
