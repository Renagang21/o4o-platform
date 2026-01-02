import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add enabled_services column to glycopharm_pharmacies table
 *
 * Phase B-1.1: enabledServices field for service activation tracking
 * This column stores the list of services that are enabled for each pharmacy
 */
export class AddEnabledServicesToGlycopharmPharmacies9990000000001 implements MigrationInterface {
  name = 'AddEnabledServicesToGlycopharmPharmacies9990000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add enabled_services column as JSONB with default empty array
    await queryRunner.query(`
      ALTER TABLE "glycopharm_pharmacies"
      ADD COLUMN IF NOT EXISTS "enabled_services" jsonb NOT NULL DEFAULT '[]'
    `);

    console.log('[Migration] Added enabled_services column to glycopharm_pharmacies');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "glycopharm_pharmacies"
      DROP COLUMN IF EXISTS "enabled_services"
    `);

    console.log('[Migration] Removed enabled_services column from glycopharm_pharmacies');
  }
}
