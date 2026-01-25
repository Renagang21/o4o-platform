/**
 * Migration: AddCmsSlotLockColumns
 *
 * WO-P7-CMS-SLOT-LOCK-P1: Add missing lock control columns to cms_content_slots table.
 *
 * These columns were added to CmsContentSlot entity but the migration was missing,
 * causing 500 errors on CMS API endpoints.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCmsSlotLockColumns1737900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if columns already exist (idempotent)
    const hasIsLocked = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'cms_content_slots' AND column_name = 'isLocked'
    `);

    if (hasIsLocked.length === 0) {
      console.log('Adding lock columns to cms_content_slots table...');

      // Add isLocked column
      await queryRunner.query(`
        ALTER TABLE cms_content_slots
        ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT false
      `);

      // Add lockedBy column
      await queryRunner.query(`
        ALTER TABLE cms_content_slots
        ADD COLUMN "lockedBy" VARCHAR(20) NULL
      `);

      // Add lockedReason column
      await queryRunner.query(`
        ALTER TABLE cms_content_slots
        ADD COLUMN "lockedReason" TEXT NULL
      `);

      // Add lockedUntil column
      await queryRunner.query(`
        ALTER TABLE cms_content_slots
        ADD COLUMN "lockedUntil" TIMESTAMP NULL
      `);

      console.log('Successfully added lock columns to cms_content_slots');
    } else {
      console.log('Lock columns already exist in cms_content_slots, skipping...');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove lock columns
    await queryRunner.query(`
      ALTER TABLE cms_content_slots DROP COLUMN IF EXISTS "lockedUntil"
    `);
    await queryRunner.query(`
      ALTER TABLE cms_content_slots DROP COLUMN IF EXISTS "lockedReason"
    `);
    await queryRunner.query(`
      ALTER TABLE cms_content_slots DROP COLUMN IF EXISTS "lockedBy"
    `);
    await queryRunner.query(`
      ALTER TABLE cms_content_slots DROP COLUMN IF EXISTS "isLocked"
    `);

    console.log('Removed lock columns from cms_content_slots');
  }
}
