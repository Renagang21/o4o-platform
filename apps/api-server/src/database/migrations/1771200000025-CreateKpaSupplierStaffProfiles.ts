import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-REGISTRATION-STRUCTURE-REFACTOR-V1
 * Create kpa_supplier_staff_profiles table for pharma/medical device company staff
 */
export class CreateKpaSupplierStaffProfiles1771200000025 implements MigrationInterface {
  name = 'CreateKpaSupplierStaffProfiles1771200000025';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('kpa_supplier_staff_profiles');
    if (tableExists) return;

    await queryRunner.query(`
      CREATE TABLE kpa_supplier_staff_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE,
        company_name VARCHAR(200) NOT NULL,
        company_type VARCHAR(100) NOT NULL,
        job_title VARCHAR(100) NULL,
        department VARCHAR(100) NULL,
        business_registration_number VARCHAR(50) NULL,
        is_verified BOOLEAN NOT NULL DEFAULT FALSE,
        verified_at TIMESTAMP NULL,
        verified_by UUID NULL,
        notes TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_kpa_supplier_staff_profiles_user_id
      ON kpa_supplier_staff_profiles (user_id)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS kpa_supplier_staff_profiles`);
  }
}
