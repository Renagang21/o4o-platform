import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Create patient_health_profiles table
 *
 * WO-GLYCOPHARM-PATIENT-PROFILE-V1
 * 환자 본인이 관리하는 건강 프로필 (당뇨 유형, 치료 방식, 신체 정보, 목표 수치).
 * userId(uuid) unique — 1:1 mapping to users table.
 */
export class CreatePatientHealthProfiles20260322000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS patient_health_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE,
        diabetes_type VARCHAR(20),
        treatment_method VARCHAR(20),
        height NUMERIC(5,1),
        weight NUMERIC(5,1),
        target_hba1c NUMERIC(3,1),
        target_glucose_low INT NOT NULL DEFAULT 70,
        target_glucose_high INT NOT NULL DEFAULT 180,
        birth_date DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_patient_health_profiles_user_id"
      ON patient_health_profiles (user_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_patient_health_profiles_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS patient_health_profiles`);
  }
}
