import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Create GlucoseView Tables Migration
 *
 * Phase C-2: GlucoseView DB Schema Implementation
 * Creates tables for vendors, view profiles, and connections
 *
 * IMPORTANT: This schema does NOT store raw CGM data or patient information.
 * It only stores metadata about vendors, display configurations, and connection status.
 */
export class CreateGlucoseViewTables1735566000000 implements MigrationInterface {
  name = 'CreateGlucoseViewTables1735566000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================================
    // glucoseview_vendors - CGM device manufacturer metadata
    // ============================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "glucoseview_vendors" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(100) NOT NULL,
        "code" varchar(50) NOT NULL UNIQUE,
        "description" text,
        "logo_url" varchar(500),
        "website_url" varchar(500),
        "supported_devices" jsonb NOT NULL DEFAULT '[]',
        "integration_type" varchar(20) NOT NULL DEFAULT 'manual',
        "status" varchar(20) NOT NULL DEFAULT 'planned',
        "sort_order" int NOT NULL DEFAULT 0,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_glucoseview_vendors_status"
        ON "glucoseview_vendors" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_glucoseview_vendors_code"
        ON "glucoseview_vendors" ("code")
    `);

    // ============================================================================
    // glucoseview_view_profiles - Display/summary configuration
    // ============================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "glucoseview_view_profiles" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(100) NOT NULL,
        "code" varchar(50) NOT NULL UNIQUE,
        "description" text,
        "summary_level" varchar(20) NOT NULL DEFAULT 'standard',
        "chart_type" varchar(20) NOT NULL DEFAULT 'daily',
        "time_range_days" int NOT NULL DEFAULT 14,
        "show_tir" boolean NOT NULL DEFAULT true,
        "show_average" boolean NOT NULL DEFAULT true,
        "show_variability" boolean NOT NULL DEFAULT false,
        "target_low" int NOT NULL DEFAULT 70,
        "target_high" int NOT NULL DEFAULT 180,
        "status" varchar(20) NOT NULL DEFAULT 'draft',
        "is_default" boolean NOT NULL DEFAULT false,
        "sort_order" int NOT NULL DEFAULT 0,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_glucoseview_view_profiles_status"
        ON "glucoseview_view_profiles" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_glucoseview_view_profiles_code"
        ON "glucoseview_view_profiles" ("code")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_glucoseview_view_profiles_default"
        ON "glucoseview_view_profiles" ("is_default")
        WHERE "is_default" = true
    `);

    // ============================================================================
    // glucoseview_connections - Pharmacy-Vendor connection status
    // ============================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "glucoseview_connections" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "pharmacy_id" uuid,
        "pharmacy_name" varchar(255),
        "vendor_id" uuid NOT NULL REFERENCES "glucoseview_vendors"("id") ON DELETE CASCADE,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "connected_at" timestamp,
        "last_verified_at" timestamp,
        "notes" text,
        "config" jsonb NOT NULL DEFAULT '{}',
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_glucoseview_connections_pharmacy"
        ON "glucoseview_connections" ("pharmacy_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_glucoseview_connections_vendor"
        ON "glucoseview_connections" ("vendor_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_glucoseview_connections_status"
        ON "glucoseview_connections" ("status")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_glucoseview_connections_pharmacy_vendor"
        ON "glucoseview_connections" ("pharmacy_id", "vendor_id")
        WHERE "pharmacy_id" IS NOT NULL
    `);

    console.log('[Migration] GlucoseView tables created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "glucoseview_connections" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "glucoseview_view_profiles" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "glucoseview_vendors" CASCADE`);

    console.log('[Migration] GlucoseView tables dropped');
  }
}
