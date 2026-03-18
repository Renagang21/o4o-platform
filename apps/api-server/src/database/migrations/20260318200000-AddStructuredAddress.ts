import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-PROFILE-UNIFICATION-V1
 *
 * 3개 테이블에 address_detail (jsonb) 컬럼 추가 + 기존 address 값 backfill.
 * 기존 address 컬럼은 하위 호환을 위해 유지.
 */
export class AddStructuredAddress1710748800000 implements MigrationInterface {
  name = 'AddStructuredAddress1710748800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. organizations
    await queryRunner.query(`
      ALTER TABLE organizations
      ADD COLUMN IF NOT EXISTS address_detail jsonb DEFAULT NULL
    `);
    await queryRunner.query(`
      UPDATE organizations
      SET address_detail = jsonb_build_object('baseAddress', address)
      WHERE address IS NOT NULL AND address != '' AND address_detail IS NULL
    `);

    // 2. glycopharm_pharmacies
    await queryRunner.query(`
      ALTER TABLE glycopharm_pharmacies
      ADD COLUMN IF NOT EXISTS address_detail jsonb DEFAULT NULL
    `);
    await queryRunner.query(`
      UPDATE glycopharm_pharmacies
      SET address_detail = jsonb_build_object('baseAddress', address)
      WHERE address IS NOT NULL AND address != '' AND address_detail IS NULL
    `);

    // 3. cosmetics_stores (cosmetics schema)
    await queryRunner.query(`
      ALTER TABLE cosmetics.cosmetics_stores
      ADD COLUMN IF NOT EXISTS address_detail jsonb DEFAULT NULL
    `);
    await queryRunner.query(`
      UPDATE cosmetics.cosmetics_stores
      SET address_detail = jsonb_build_object(
        'baseAddress', COALESCE(address, ''),
        'region', region
      )
      WHERE address IS NOT NULL AND address != '' AND address_detail IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE organizations DROP COLUMN IF EXISTS address_detail`);
    await queryRunner.query(`ALTER TABLE glycopharm_pharmacies DROP COLUMN IF EXISTS address_detail`);
    await queryRunner.query(`ALTER TABLE cosmetics.cosmetics_stores DROP COLUMN IF EXISTS address_detail`);
  }
}
