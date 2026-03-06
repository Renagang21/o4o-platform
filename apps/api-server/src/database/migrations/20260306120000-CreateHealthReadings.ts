import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHealthReadings20260306120000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "health_readings" (
        "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "patient_id"    UUID NOT NULL,
        "metric_type"   VARCHAR(50) NOT NULL DEFAULT 'glucose',
        "value_numeric" NUMERIC(10, 2),
        "value_text"    TEXT,
        "unit"          VARCHAR(20) NOT NULL DEFAULT 'mg/dL',
        "measured_at"   TIMESTAMPTZ NOT NULL,
        "source_type"   VARCHAR(30) NOT NULL DEFAULT 'manual',
        "created_by"    UUID,
        "metadata"      JSONB DEFAULT '{}',
        "pharmacy_id"   UUID NOT NULL,
        "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_health_readings_patient_measured"
        ON "health_readings" ("patient_id", "measured_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_health_readings_pharmacy"
        ON "health_readings" ("pharmacy_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "health_readings"`);
  }
}
