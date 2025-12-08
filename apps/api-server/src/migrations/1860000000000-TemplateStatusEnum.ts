import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Template Status Enum
 *
 * Changes the `active` boolean column to a `status` enum column
 * with values: 'draft' | 'published'
 *
 * Data migration:
 * - active = true  → status = 'published'
 * - active = false → status = 'draft'
 */
export class TemplateStatusEnum1860000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if templates table exists
    const tableExists = await queryRunner.hasTable('templates');
    if (!tableExists) {
      console.log('templates table does not exist, skipping migration');
      return;
    }

    // Check if active column exists
    const table = await queryRunner.getTable('templates');
    const activeColumn = table?.columns.find((col) => col.name === 'active');

    if (!activeColumn) {
      console.log('active column does not exist, checking for status column');
      const statusColumn = table?.columns.find((col) => col.name === 'status');
      if (statusColumn) {
        console.log('status column already exists, skipping migration');
        return;
      }
    }

    // Step 1: Create the enum type
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'templates_status_enum') THEN
          CREATE TYPE templates_status_enum AS ENUM ('draft', 'published');
        END IF;
      END $$;
    `);

    // Step 2: Add status column with default 'draft'
    await queryRunner.query(`
      ALTER TABLE templates
      ADD COLUMN IF NOT EXISTS status templates_status_enum DEFAULT 'draft'
    `);

    // Step 3: Migrate data from active to status
    if (activeColumn) {
      await queryRunner.query(`
        UPDATE templates
        SET status = CASE
          WHEN active = true THEN 'published'::templates_status_enum
          ELSE 'draft'::templates_status_enum
        END
      `);

      // Step 4: Drop the active column
      await queryRunner.query(`
        ALTER TABLE templates
        DROP COLUMN IF EXISTS active
      `);
    }

    console.log('Migration completed: Template status enum applied');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if templates table exists
    const tableExists = await queryRunner.hasTable('templates');
    if (!tableExists) {
      return;
    }

    // Step 1: Add active column back
    await queryRunner.query(`
      ALTER TABLE templates
      ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true
    `);

    // Step 2: Migrate data back from status to active
    await queryRunner.query(`
      UPDATE templates
      SET active = CASE
        WHEN status = 'published' THEN true
        ELSE false
      END
    `);

    // Step 3: Drop status column
    await queryRunner.query(`
      ALTER TABLE templates
      DROP COLUMN IF EXISTS status
    `);

    // Step 4: Drop the enum type
    await queryRunner.query(`
      DROP TYPE IF EXISTS templates_status_enum
    `);
  }
}
