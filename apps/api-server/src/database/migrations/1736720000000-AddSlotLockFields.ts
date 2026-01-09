import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddSlotLockFields Migration
 * WO-P7-CMS-SLOT-LOCK-P1
 *
 * Adds lock fields to cms_content_slots table for edit restrictions.
 *
 * Purpose: Protect store autonomy by clearly marking which slots are:
 * - Freely editable by store (is_locked = false)
 * - Locked by contract agreement (is_locked = true)
 *
 * This is NOT a control mechanism - it's a boundary definition
 * that protects store rights while honoring contract agreements.
 */
export class AddSlotLockFields1736720000000 implements MigrationInterface {
  name = 'AddSlotLockFields1736720000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add lock control columns
    await queryRunner.query(`
      ALTER TABLE "cms_content_slots"
      ADD COLUMN "is_locked" BOOLEAN NOT NULL DEFAULT FALSE
    `);

    await queryRunner.query(`
      ALTER TABLE "cms_content_slots"
      ADD COLUMN "locked_by" VARCHAR(20)
    `);

    await queryRunner.query(`
      ALTER TABLE "cms_content_slots"
      ADD COLUMN "locked_reason" TEXT
    `);

    await queryRunner.query(`
      ALTER TABLE "cms_content_slots"
      ADD COLUMN "locked_until" TIMESTAMP
    `);

    // Add check constraint for locked_by values
    await queryRunner.query(`
      ALTER TABLE "cms_content_slots"
      ADD CONSTRAINT "CHK_slot_locked_by"
      CHECK ("locked_by" IS NULL OR "locked_by" IN ('platform', 'contract'))
    `);

    // Add comment for documentation
    await queryRunner.query(`
      COMMENT ON COLUMN "cms_content_slots"."is_locked" IS 'When true, store cannot edit this slot (WO-P7-CMS-SLOT-LOCK-P1)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "cms_content_slots"."locked_by" IS 'Who locked the slot: platform or contract'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "cms_content_slots"."locked_reason" IS 'Human-readable reason for the lock (displayed in UI)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "cms_content_slots"."locked_until" IS 'Contract end date - null means indefinite lock'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cms_content_slots"
      DROP CONSTRAINT IF EXISTS "CHK_slot_locked_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "cms_content_slots"
      DROP COLUMN IF EXISTS "locked_until"
    `);

    await queryRunner.query(`
      ALTER TABLE "cms_content_slots"
      DROP COLUMN IF EXISTS "locked_reason"
    `);

    await queryRunner.query(`
      ALTER TABLE "cms_content_slots"
      DROP COLUMN IF EXISTS "locked_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "cms_content_slots"
      DROP COLUMN IF EXISTS "is_locked"
    `);
  }
}
