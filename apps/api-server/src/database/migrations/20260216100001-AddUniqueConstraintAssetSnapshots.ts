import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-A-ASSET-COPY-STABILIZATION-V1
 * Add UNIQUE constraint to prevent duplicate asset snapshots (race condition protection)
 */
export class AddUniqueConstraintAssetSnapshots20260216100001 implements MigrationInterface {
  name = 'AddUniqueConstraintAssetSnapshots20260216100001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if constraint already exists (idempotent)
    const constraintExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'UQ_asset_snapshot_org_source_type'
      ) AS "exists";
    `);

    if (constraintExists[0]?.exists) {
      console.log('[AddUniqueConstraintAssetSnapshots] Constraint already exists, skipping.');
      return;
    }

    await queryRunner.query(`
      ALTER TABLE "o4o_asset_snapshots"
      ADD CONSTRAINT "UQ_asset_snapshot_org_source_type"
      UNIQUE ("organization_id", "source_asset_id", "asset_type")
    `);

    console.log('[AddUniqueConstraintAssetSnapshots] UNIQUE constraint created successfully.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "o4o_asset_snapshots"
      DROP CONSTRAINT IF EXISTS "UQ_asset_snapshot_org_source_type"
    `);
  }
}
