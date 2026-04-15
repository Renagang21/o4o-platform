import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-REGISTRATION-STRUCTURE-REFACTOR-V1
 * Create kpa_external_expert_profiles table for external expert members
 */
export class CreateKpaExternalExpertProfiles1771200000024 implements MigrationInterface {
  name = 'CreateKpaExternalExpertProfiles1771200000024';

  async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('kpa_external_expert_profiles');
    if (tableExists) return;

    await queryRunner.query(`
      CREATE TABLE kpa_external_expert_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE,
        expert_domain VARCHAR(100) NOT NULL,
        institution_name VARCHAR(200) NULL,
        institution_type VARCHAR(100) NULL,
        department VARCHAR(200) NULL,
        qualification VARCHAR(200) NULL,
        qualification_type VARCHAR(100) NULL,
        is_verified BOOLEAN NOT NULL DEFAULT FALSE,
        verified_at TIMESTAMP NULL,
        verified_by UUID NULL,
        notes TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_kpa_external_expert_profiles_user_id
      ON kpa_external_expert_profiles (user_id)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS kpa_external_expert_profiles`);
  }
}
