/**
 * WO-O4O-SNAPSHOT-POLICY-MIGRATION-V1
 *
 * Add snapshot_type and lifecycle_status columns to kpa_store_asset_controls.
 * Extension layer only — Core (o4o_asset_snapshots) remains FROZEN.
 *
 * snapshot_type:     user_copy | hq_forced | campaign_push | template_seed
 * lifecycle_status:  active | expired | archived
 *
 * Data migration: existing is_forced=true rows → snapshot_type='hq_forced'
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSnapshotPolicyColumns20260222000001 implements MigrationInterface {
  name = 'AddSnapshotPolicyColumns20260222000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Idempotent check
    const colCheck = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'kpa_store_asset_controls'
        AND column_name = 'snapshot_type'
    `);

    if (colCheck.length > 0) {
      console.log('[Migration] snapshot_type column already exists on kpa_store_asset_controls, skipping.');
      return;
    }

    // Add columns with defaults
    await queryRunner.query(`
      ALTER TABLE "kpa_store_asset_controls"
        ADD COLUMN "snapshot_type" VARCHAR(20) NOT NULL DEFAULT 'user_copy',
        ADD COLUMN "lifecycle_status" VARCHAR(20) NOT NULL DEFAULT 'active'
    `);

    // Data migration: existing forced rows → hq_forced
    const result = await queryRunner.query(`
      UPDATE "kpa_store_asset_controls"
      SET "snapshot_type" = 'hq_forced'
      WHERE "is_forced" = true
    `);

    console.log(`[Migration] snapshot_type/lifecycle_status columns added. ${result?.[1] || 0} rows set to hq_forced.`);

    // Index for lifecycle_status filtering (execution gate)
    await queryRunner.query(`
      CREATE INDEX "IDX_kpa_store_asset_ctrl_lifecycle"
        ON "kpa_store_asset_controls" ("lifecycle_status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_kpa_store_asset_ctrl_lifecycle"`);
    await queryRunner.query(`
      ALTER TABLE "kpa_store_asset_controls"
        DROP COLUMN IF EXISTS "snapshot_type",
        DROP COLUMN IF EXISTS "lifecycle_status"
    `);
  }
}
