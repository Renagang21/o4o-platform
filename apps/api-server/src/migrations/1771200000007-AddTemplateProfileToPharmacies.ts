import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTemplateProfileToPharmacies1771200000007 implements MigrationInterface {
  name = 'AddTemplateProfileToPharmacies1771200000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "glycopharm_pharmacies"
        ADD COLUMN IF NOT EXISTS "template_profile" VARCHAR(30) NOT NULL DEFAULT 'BASIC';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "glycopharm_pharmacies"
        DROP COLUMN IF EXISTS "template_profile";
    `);
  }
}
