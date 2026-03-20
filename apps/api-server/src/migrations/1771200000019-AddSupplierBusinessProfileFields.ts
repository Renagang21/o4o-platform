import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-SUPPLIER-BUSINESS-PROFILE-FORM-ALIGNMENT-V1
 *
 * Add business profile fields to neture_suppliers:
 * P0: business_number, representative_name
 * P1: business_address, manager_name, manager_phone
 * P2: business_type, tax_email
 */
export class AddSupplierBusinessProfileFields1771200000019
  implements MigrationInterface
{
  name = 'AddSupplierBusinessProfileFields1771200000019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // P0
    await queryRunner.query(
      `ALTER TABLE "neture_suppliers" ADD COLUMN IF NOT EXISTS "business_number" VARCHAR(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "neture_suppliers" ADD COLUMN IF NOT EXISTS "representative_name" VARCHAR(100)`,
    );
    // P1
    await queryRunner.query(
      `ALTER TABLE "neture_suppliers" ADD COLUMN IF NOT EXISTS "business_address" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "neture_suppliers" ADD COLUMN IF NOT EXISTS "manager_name" VARCHAR(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "neture_suppliers" ADD COLUMN IF NOT EXISTS "manager_phone" VARCHAR(50)`,
    );
    // P2
    await queryRunner.query(
      `ALTER TABLE "neture_suppliers" ADD COLUMN IF NOT EXISTS "business_type" VARCHAR(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "neture_suppliers" ADD COLUMN IF NOT EXISTS "tax_email" VARCHAR(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "neture_suppliers" DROP COLUMN IF EXISTS "tax_email"`,
    );
    await queryRunner.query(
      `ALTER TABLE "neture_suppliers" DROP COLUMN IF EXISTS "business_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "neture_suppliers" DROP COLUMN IF EXISTS "manager_phone"`,
    );
    await queryRunner.query(
      `ALTER TABLE "neture_suppliers" DROP COLUMN IF EXISTS "manager_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "neture_suppliers" DROP COLUMN IF EXISTS "business_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "neture_suppliers" DROP COLUMN IF EXISTS "representative_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "neture_suppliers" DROP COLUMN IF EXISTS "business_number"`,
    );
  }
}
