import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-CARE-MULTI-METRIC-ANALYSIS-V1
 *
 * Adds metadata JSONB column to care_kpi_snapshots for storing
 * multi-metric analysis results (BP, weight, metabolic risk).
 */
export class AddMetadataToKpiSnapshots20260308100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "care_kpi_snapshots"
      ADD COLUMN "metadata" JSONB DEFAULT '{}'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "care_kpi_snapshots"
      DROP COLUMN "metadata"
    `);
  }
}
