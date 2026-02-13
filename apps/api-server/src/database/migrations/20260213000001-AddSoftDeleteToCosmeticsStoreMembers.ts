/**
 * Migration: Add soft delete columns to cosmetics_store_members
 *
 * WO-K-COSMETICS-OPERATOR-SOFT-DEACTIVATE-V1
 * Hard delete → soft deactivate 전환.
 * is_active, deactivated_at, deactivated_by 컬럼 추가.
 */

import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddSoftDeleteToCosmeticsStoreMembers20260213000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cosmetics.cosmetics_store_members
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS deactivated_by UUID
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_csm_is_active
        ON cosmetics.cosmetics_store_members (is_active)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS cosmetics.IDX_csm_is_active`);
    await queryRunner.query(`
      ALTER TABLE cosmetics.cosmetics_store_members
        DROP COLUMN IF EXISTS deactivated_by,
        DROP COLUMN IF EXISTS deactivated_at,
        DROP COLUMN IF EXISTS is_active
    `);
  }
}
