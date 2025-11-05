import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create Widget Areas Table
 *
 * Creates the widget_areas table for managing widget/sidebar locations
 * where widgets can be placed in the frontend.
 *
 * Features:
 * - UUID primary key
 * - Unique slug for identification
 * - Location categorization (header, footer, sidebar, etc.)
 * - Active/inactive status
 * - Sort ordering
 * - Meta data (JSONB) for additional configuration
 * - Includes default widget areas (header, footer, sidebar)
 *
 * Rollback: Drops the widget_areas table
 *
 * @migration 2000000000004
 * @phase Phase 4 - De-Mock
 */
export class CreateWidgetAreasTable2000000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create widget_areas table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "widget_areas" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "slug" character varying(100) NOT NULL UNIQUE,
        "name" character varying(255) NOT NULL,
        "description" text,
        "location" character varying(50),
        "isActive" boolean NOT NULL DEFAULT true,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "meta" jsonb,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_widget_areas" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_widget_areas_slug" UNIQUE ("slug")
      )
    `);

    // Create index for active widget areas (most common query)
    const activeIndexExists = await queryRunner.query(`
      SELECT 1 FROM pg_indexes
      WHERE indexname = 'IDX_widget_areas_active'
    `);
    if (!activeIndexExists || activeIndexExists.length === 0) {
      await queryRunner.query(`
        CREATE INDEX "IDX_widget_areas_active"
        ON "widget_areas" ("isActive", "sortOrder")
      `);
    }

    // Create index for location-based queries
    const locationIndexExists = await queryRunner.query(`
      SELECT 1 FROM pg_indexes
      WHERE indexname = 'IDX_widget_areas_location'
    `);
    if (!locationIndexExists || locationIndexExists.length === 0) {
      await queryRunner.query(`
        CREATE INDEX "IDX_widget_areas_location"
        ON "widget_areas" ("location")
      `);
    }

    // Insert default widget areas
    await queryRunner.query(`
      INSERT INTO "widget_areas" ("slug", "name", "description", "location", "isActive", "sortOrder")
      VALUES
        ('header-widgets', 'Header Widgets', 'Widgets displayed in the header area', 'header', true, 10),
        ('footer-widgets', 'Footer Widgets', 'Widgets displayed in the footer area', 'footer', true, 20),
        ('sidebar-widgets', 'Sidebar Widgets', 'Widgets displayed in the sidebar area', 'sidebar', true, 30),
        ('primary-sidebar', 'Primary Sidebar', 'Primary sidebar widget area for blog and pages', 'sidebar', true, 40),
        ('secondary-sidebar', 'Secondary Sidebar', 'Secondary sidebar widget area', 'sidebar', true, 50)
      ON CONFLICT ("slug") DO NOTHING
    `);

    console.log('✅ Created widget_areas table with indexes and default data');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_widget_areas_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_widget_areas_location"`);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "widget_areas"`);

    console.log('✅ Rolled back widget_areas table');
  }
}
