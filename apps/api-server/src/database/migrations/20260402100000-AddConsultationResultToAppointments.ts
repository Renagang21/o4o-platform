import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-CARE-CONSULTATION-RESULT-SHARING-V1
 * care_appointments에 상담 결과 컬럼 추가
 */
export class AddConsultationResultToAppointments20260402100000 implements MigrationInterface {
  name = 'AddConsultationResultToAppointments20260402100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE care_appointments
        ADD COLUMN IF NOT EXISTS consultation_summary TEXT,
        ADD COLUMN IF NOT EXISTS consultation_recommendation TEXT,
        ADD COLUMN IF NOT EXISTS consultation_shared_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS consultation_recorded_by UUID
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE care_appointments
        DROP COLUMN IF EXISTS consultation_summary,
        DROP COLUMN IF EXISTS consultation_recommendation,
        DROP COLUMN IF EXISTS consultation_shared_at,
        DROP COLUMN IF EXISTS consultation_recorded_by
    `);
  }
}
