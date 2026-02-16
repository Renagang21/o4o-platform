import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-GLYCOPHARM-CARE-DATA-ISOLATION-PHASE1-V1
 *
 * Add pharmacy_id to care_kpi_snapshots for pharmacy-level data isolation.
 * Strategy A: TRUNCATE existing data + NOT NULL immediately.
 */
export class AddPharmacyIdToCareKpiSnapshots20260215100001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Truncate existing data (WO decision: data not critical, clean slate)
    await queryRunner.query(`TRUNCATE TABLE care_kpi_snapshots`);

    // Add pharmacy_id column (NOT NULL from start)
    await queryRunner.query(`
      ALTER TABLE care_kpi_snapshots
      ADD COLUMN pharmacy_id UUID NOT NULL
    `);

    // Index for pharmacy-scoped queries
    await queryRunner.query(`
      CREATE INDEX idx_care_kpi_pharmacy_id
      ON care_kpi_snapshots (pharmacy_id)
    `);

    // Composite index for pharmacy + patient queries
    await queryRunner.query(`
      CREATE INDEX idx_care_kpi_pharmacy_patient
      ON care_kpi_snapshots (pharmacy_id, patient_id, created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_care_kpi_pharmacy_patient`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_care_kpi_pharmacy_id`);
    await queryRunner.query(`ALTER TABLE care_kpi_snapshots DROP COLUMN pharmacy_id`);
  }
}
