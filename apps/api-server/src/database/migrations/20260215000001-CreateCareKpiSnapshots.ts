import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCareKpiSnapshots20260215000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS care_kpi_snapshots (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        patient_id UUID NOT NULL,
        tir INT NOT NULL,
        cv INT NOT NULL,
        risk_level VARCHAR(20) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_care_kpi_patient_created ON care_kpi_snapshots (patient_id, created_at DESC)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS care_kpi_snapshots`);
  }
}
