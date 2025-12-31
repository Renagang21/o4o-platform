import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Create CGM Patient Tables Migration
 *
 * Phase C-3: GlucoseView Patient Data Schema
 * Creates tables for CGM patients, summaries, and insights
 *
 * NOTE: These are summary tables only. Raw CGM data is NOT stored here.
 */
export class CreateCgmTables1735617600000 implements MigrationInterface {
  name = 'CreateCgmTables1735617600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================================
    // cgm_patients - CGM patient metadata
    // ============================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cgm_patients" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" varchar(255) NOT NULL,
        "pharmacy_id" uuid,
        "name" varchar(100) NOT NULL,
        "registered_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_cgm_patients_user_id"
        ON "cgm_patients" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_cgm_patients_pharmacy_id"
        ON "cgm_patients" ("pharmacy_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_cgm_patients_is_active"
        ON "cgm_patients" ("is_active")
    `);

    // ============================================================================
    // cgm_patient_summaries - Period-based CGM summary data
    // ============================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cgm_patient_summaries" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "patient_id" uuid NOT NULL REFERENCES "cgm_patients"("id") ON DELETE CASCADE,
        "period_start" date NOT NULL,
        "period_end" date NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'normal',
        "avg_glucose" numeric(5,1) NOT NULL,
        "time_in_range" numeric(5,2) NOT NULL,
        "time_above_range" numeric(5,2),
        "time_below_range" numeric(5,2),
        "summary_text" text,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_cgm_patient_summaries_patient_id"
        ON "cgm_patient_summaries" ("patient_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_cgm_patient_summaries_period"
        ON "cgm_patient_summaries" ("period_start", "period_end")
    `);

    // ============================================================================
    // cgm_glucose_insights - AI/Pharmacist insights
    // ============================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cgm_glucose_insights" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "patient_id" uuid NOT NULL REFERENCES "cgm_patients"("id") ON DELETE CASCADE,
        "insight_type" varchar(50) NOT NULL,
        "description" text NOT NULL,
        "generated_by" varchar(20) NOT NULL DEFAULT 'system',
        "reference_period" varchar(100),
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_cgm_glucose_insights_patient_id"
        ON "cgm_glucose_insights" ("patient_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_cgm_glucose_insights_type"
        ON "cgm_glucose_insights" ("insight_type")
    `);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "cgm_glucose_insights" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cgm_patient_summaries" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cgm_patients" CASCADE`);
  }
}
