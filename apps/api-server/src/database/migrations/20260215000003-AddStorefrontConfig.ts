/**
 * Migration: Add storefront_config JSONB column to glycopharm_pharmacies
 * WO-O4O-STOREFRONT-ACTIVATION-V1 Phase 3
 */
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStorefrontConfig20260215000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guard: check if column already exists
    const result = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'glycopharm_pharmacies' AND column_name = 'storefront_config'
    `);
    if (result.length > 0) return;

    await queryRunner.query(`
      ALTER TABLE glycopharm_pharmacies
      ADD COLUMN storefront_config JSONB DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE glycopharm_pharmacies
      DROP COLUMN IF EXISTS storefront_config
    `);
  }
}
