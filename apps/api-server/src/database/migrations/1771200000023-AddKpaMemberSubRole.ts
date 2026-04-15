import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-REGISTRATION-STRUCTURE-REFACTOR-V1
 * Add sub_role column to kpa_members for group-level role specificity
 */
export class AddKpaMemberSubRole1771200000023 implements MigrationInterface {
  name = 'AddKpaMemberSubRole1771200000023';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Add sub_role column (nullable — existing rows keep null)
    await queryRunner.query(`
      ALTER TABLE kpa_members
      ADD COLUMN IF NOT EXISTS sub_role VARCHAR(100) NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE kpa_members
      DROP COLUMN IF EXISTS sub_role
    `);
  }
}
