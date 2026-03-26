/**
 * AddPatientReadAtToCoaching
 *
 * WO-O4O-CARE-MIGRATION-HOTFIX-V1
 * care_coaching_sessions 테이블에 patient_read_at 컬럼 추가
 *
 * Entity: apps/api-server/src/modules/care/entities/care-coaching-session.entity.ts
 * IF NOT EXISTS: 이미 존재해도 안전하게 스킵
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPatientReadAtToCoaching20260327000200 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL 12+ supports ADD COLUMN IF NOT EXISTS
    await queryRunner.query(`
      ALTER TABLE care_coaching_sessions
      ADD COLUMN IF NOT EXISTS patient_read_at TIMESTAMPTZ NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_coaching_patient_read_at
      ON care_coaching_sessions(patient_read_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_coaching_patient_read_at;
    `);

    await queryRunner.query(`
      ALTER TABLE care_coaching_sessions
      DROP COLUMN IF EXISTS patient_read_at;
    `);
  }
}
