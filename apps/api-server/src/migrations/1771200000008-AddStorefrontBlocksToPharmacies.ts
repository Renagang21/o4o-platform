import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-STORE-BLOCK-ENGINE-V1
 *
 * glycopharm_pharmacies 테이블에 storefront_blocks JSONB 컬럼 추가.
 * NULL이면 template_profile 기반 기본 블록 사용 (fallback).
 */
export class AddStorefrontBlocksToPharmacies1771200000008 implements MigrationInterface {
  name = 'AddStorefrontBlocksToPharmacies1771200000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE glycopharm_pharmacies
      ADD COLUMN IF NOT EXISTS storefront_blocks JSONB NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE glycopharm_pharmacies
      DROP COLUMN IF EXISTS storefront_blocks;
    `);
  }
}
