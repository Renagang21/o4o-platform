import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-PRODUCT-REGISTRATION-UI-ALIGN-TO-IMPORT-V1
 *
 * product_categories에 is_regulated 컬럼 추가.
 * 규제 카테고리(건강기능식품, 의약외품 등)에서만 MFDS 필드를 필수로 요구하기 위함.
 */
export class AddIsRegulatedToProductCategories20260323500000 implements MigrationInterface {
  name = 'AddIsRegulatedToProductCategories20260323500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_categories
      ADD COLUMN IF NOT EXISTS is_regulated BOOLEAN NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_categories
      DROP COLUMN IF EXISTS is_regulated
    `);
  }
}
