import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-MARKET-TRIAL-SERVICE-KEY-REMOVAL-V2
 *
 * 1. TRUNCATE all Market Trial data (structural reset)
 * 2. DROP visibleServiceKeys column + GIN index
 *
 * This migration is irreversible — existing trial data is discarded
 * as part of the Neture single-execution policy restructure.
 */
export class ResetMarketTrialDataAndRemoveServiceKeys20260419400000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Delete all data from child tables first (safe order)
    await queryRunner.query(`DELETE FROM "market_trial_forum_sync_failures"`);
    await queryRunner.query(`DELETE FROM "market_trial_fulfillments"`);
    await queryRunner.query(`DELETE FROM "market_trial_shipping_addresses"`);
    await queryRunner.query(`DELETE FROM "market_trial_decisions"`);
    await queryRunner.query(`DELETE FROM "market_trial_participants"`);
    await queryRunner.query(`DELETE FROM "market_trial_forums"`);
    await queryRunner.query(`DELETE FROM "market_trials"`);

    // 2. Drop GIN index on visibleServiceKeys
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_market_trials_visibleServiceKeys"`,
    );

    // 3. Drop the column
    await queryRunner.query(
      `ALTER TABLE "market_trials" DROP COLUMN IF EXISTS "visibleServiceKeys"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add column (data cannot be restored)
    await queryRunner.query(
      `ALTER TABLE "market_trials" ADD COLUMN IF NOT EXISTS "visibleServiceKeys" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_market_trials_visibleServiceKeys" ON "market_trials" USING GIN ("visibleServiceKeys")`,
    );
  }
}
