import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContactVisibilityToNetureSuppliers2026020400001 implements MigrationInterface {
  name = 'AddContactVisibilityToNetureSuppliers2026020400001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "neture_suppliers"
      ADD COLUMN IF NOT EXISTS "contact_email_visibility" varchar(10) NOT NULL DEFAULT 'public'
    `);

    await queryRunner.query(`
      ALTER TABLE "neture_suppliers"
      ADD COLUMN IF NOT EXISTS "contact_phone_visibility" varchar(10) NOT NULL DEFAULT 'private'
    `);

    await queryRunner.query(`
      ALTER TABLE "neture_suppliers"
      ADD COLUMN IF NOT EXISTS "contact_website_visibility" varchar(10) NOT NULL DEFAULT 'public'
    `);

    await queryRunner.query(`
      ALTER TABLE "neture_suppliers"
      ADD COLUMN IF NOT EXISTS "contact_kakao_visibility" varchar(10) NOT NULL DEFAULT 'partners'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "neture_suppliers" DROP COLUMN IF EXISTS "contact_kakao_visibility"`);
    await queryRunner.query(`ALTER TABLE "neture_suppliers" DROP COLUMN IF EXISTS "contact_website_visibility"`);
    await queryRunner.query(`ALTER TABLE "neture_suppliers" DROP COLUMN IF EXISTS "contact_phone_visibility"`);
    await queryRunner.query(`ALTER TABLE "neture_suppliers" DROP COLUMN IF EXISTS "contact_email_visibility"`);
  }
}
