import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-REGISTRATION-STRUCTURE-REFACTOR-V1
 * Make kpa_members.organization_id nullable
 * Required for external_expert and supplier_staff who may not belong to a district/branch org
 */
export class MakeKpaMemberOrganizationIdNullable1771200000026 implements MigrationInterface {
  name = 'MakeKpaMemberOrganizationIdNullable1771200000026';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE kpa_members
      ALTER COLUMN organization_id DROP NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Set null values to a sentinel before re-adding NOT NULL constraint
    await queryRunner.query(`
      UPDATE kpa_members
      SET organization_id = '00000000-0000-0000-0000-000000000000'
      WHERE organization_id IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE kpa_members
      ALTER COLUMN organization_id SET NOT NULL
    `);
  }
}
