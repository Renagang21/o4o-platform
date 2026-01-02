import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Create GlucoseView Application Tables Migration
 *
 * Phase C-4: GlucoseView Application Workflow
 * Creates glucoseview_applications and glucoseview_pharmacies tables
 */
export class CreateGlucoseViewApplicationTables9991000000000 implements MigrationInterface {
  name = 'CreateGlucoseViewApplicationTables9991000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================================
    // Create glucoseview_applications table
    // ============================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "glucoseview_applications" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "pharmacy_id" uuid,
        "pharmacy_name" varchar(255) NOT NULL,
        "business_number" varchar(100),
        "service_types" jsonb NOT NULL DEFAULT '["cgm_view"]',
        "note" text,
        "status" varchar(20) NOT NULL DEFAULT 'submitted',
        "rejection_reason" text,
        "submitted_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "decided_at" timestamp with time zone,
        "decided_by" uuid,
        "metadata" jsonb,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_glucoseview_applications_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);

    // Indexes for applications
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glucoseview_applications_user_id" ON "glucoseview_applications" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glucoseview_applications_status" ON "glucoseview_applications" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glucoseview_applications_submitted_at" ON "glucoseview_applications" ("submitted_at")
    `);

    // ============================================================================
    // Create glucoseview_pharmacies table
    // ============================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "glucoseview_pharmacies" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "glycopharm_pharmacy_id" uuid,
        "name" varchar(255) NOT NULL,
        "business_number" varchar(100),
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "enabled_services" jsonb NOT NULL DEFAULT '[]',
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Indexes for pharmacies
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glucoseview_pharmacies_user_id" ON "glucoseview_pharmacies" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glucoseview_pharmacies_status" ON "glucoseview_pharmacies" ("status")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_glucoseview_pharmacies_user_unique" ON "glucoseview_pharmacies" ("user_id")
    `);

    console.log('[Migration] GlucoseView application tables created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "glucoseview_pharmacies"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "glucoseview_applications"`);

    console.log('[Migration] GlucoseView application tables dropped');
  }
}
