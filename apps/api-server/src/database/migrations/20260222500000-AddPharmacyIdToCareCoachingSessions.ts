import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-ORG-RESOLUTION-UNIFICATION-V1
 *
 * Add pharmacy_id to care_coaching_sessions.
 * Entity has this column but CREATE TABLE migration (20260215000002) omitted it.
 * Seed data inserts pharmacy_id, so this column is needed in production.
 */
export class AddPharmacyIdToCareCoachingSessions20260222500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE care_coaching_sessions
      ADD COLUMN IF NOT EXISTS pharmacy_id UUID
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_care_coaching_pharmacy_id
      ON care_coaching_sessions (pharmacy_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_care_coaching_pharmacy_id`);
    await queryRunner.query(`ALTER TABLE care_coaching_sessions DROP COLUMN IF EXISTS pharmacy_id`);
  }
}
