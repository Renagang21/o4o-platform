import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEnabledServicesToPharmacy1736400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists
    const hasColumn = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'glycopharm_pharmacies'
      AND column_name = 'enabled_services'
    `);

    if (hasColumn.length === 0) {
      await queryRunner.query(`
        ALTER TABLE glycopharm_pharmacies
        ADD COLUMN enabled_services jsonb DEFAULT '[]'
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE glycopharm_pharmacies
      DROP COLUMN IF EXISTS enabled_services
    `);
  }
}
