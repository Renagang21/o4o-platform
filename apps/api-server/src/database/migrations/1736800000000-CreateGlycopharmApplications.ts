import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Create Glycopharm Applications Table
 *
 * This migration creates the glycopharm_applications table for pharmacy
 * participation/service application workflow and ensures enabled_services
 * column exists on glycopharm_pharmacies table.
 */
export class CreateGlycopharmApplications1736800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, check if glycopharm_pharmacies table exists and add enabled_services if missing
    const pharmaciesTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'glycopharm_pharmacies'
      )
    `);

    if (pharmaciesTableExists[0]?.exists) {
      const hasEnabledServices = await queryRunner.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'glycopharm_pharmacies'
        AND column_name = 'enabled_services'
      `);

      if (hasEnabledServices.length === 0) {
        await queryRunner.query(`
          ALTER TABLE glycopharm_pharmacies
          ADD COLUMN enabled_services jsonb DEFAULT '[]'
        `);
      }
    }

    // Create glycopharm_applications table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "glycopharm_applications" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "organization_type" VARCHAR(50) NOT NULL,
        "organization_name" VARCHAR(255) NOT NULL,
        "business_number" VARCHAR(100),
        "service_types" jsonb NOT NULL DEFAULT '[]',
        "note" TEXT,
        "status" VARCHAR(20) NOT NULL DEFAULT 'submitted',
        "rejection_reason" TEXT,
        "submitted_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "decided_at" TIMESTAMP WITH TIME ZONE,
        "decided_by" uuid,
        "metadata" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "FK_glycopharm_applications_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for glycopharm_applications
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glycopharm_applications_user_id"
      ON "glycopharm_applications" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glycopharm_applications_status"
      ON "glycopharm_applications" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_glycopharm_applications_submitted_at"
      ON "glycopharm_applications" ("submitted_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "glycopharm_applications" CASCADE`);
  }
}
