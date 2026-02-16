import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-GLYCOPHARM-CARE-DATA-ISOLATION-PHASE1-V1
 *
 * Add pharmacy_id to care_coaching_sessions for pharmacy-level data isolation.
 * Strategy A: TRUNCATE existing data + NOT NULL immediately.
 */
export class AddPharmacyIdToCareCoachingSessions20260215100002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Truncate existing data (WO decision: data not critical, clean slate)
    await queryRunner.query(`TRUNCATE TABLE care_coaching_sessions`);

    // Add pharmacy_id column (NOT NULL from start)
    await queryRunner.query(`
      ALTER TABLE care_coaching_sessions
      ADD COLUMN pharmacy_id UUID NOT NULL
    `);

    // Index for pharmacy-scoped queries
    await queryRunner.query(`
      CREATE INDEX idx_care_coaching_pharmacy_id
      ON care_coaching_sessions (pharmacy_id)
    `);

    // Composite index for pharmacy + patient queries
    await queryRunner.query(`
      CREATE INDEX idx_care_coaching_pharmacy_patient
      ON care_coaching_sessions (pharmacy_id, patient_id, created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_care_coaching_pharmacy_patient`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_care_coaching_pharmacy_id`);
    await queryRunner.query(`ALTER TABLE care_coaching_sessions DROP COLUMN pharmacy_id`);
  }
}
