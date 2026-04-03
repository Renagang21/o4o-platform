import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-DISTRIBUTION-MODEL-SPLIT-PUBLIC-AND-SERVICE-SUPPLY-V1
 *
 * 기본 공개 여부(isPublic)를 distributionType에서 분리.
 * 1. is_public boolean 컬럼 추가 (default false)
 * 2. 기존 distribution_type = 'PUBLIC' → is_public = true 백필
 */
export class AddIsPublicToSupplierProductOffers20260403200000 implements MigrationInterface {
  name = 'AddIsPublicToSupplierProductOffers20260403200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add column
    await queryRunner.query(`
      ALTER TABLE supplier_product_offers
      ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false
    `);

    // 2. Backfill: PUBLIC → is_public = true
    await queryRunner.query(`
      UPDATE supplier_product_offers
      SET is_public = true
      WHERE distribution_type = 'PUBLIC'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE supplier_product_offers
      DROP COLUMN IF EXISTS is_public
    `);
  }
}
