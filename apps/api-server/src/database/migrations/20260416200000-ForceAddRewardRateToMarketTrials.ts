import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-MARKET-TRIAL-CROWDFUNDING-CORE-ALIGNMENT-V1 — force patch
 *
 * 20260416100000-AddRewardRateToMarketTrials was recorded in typeorm_migrations
 * but the actual ALTER TABLE was not applied (column missing in DB).
 * This migration re-applies it unconditionally using IF NOT EXISTS.
 */
export class ForceAddRewardRateToMarketTrials20260416200000 implements MigrationInterface {
  name = 'ForceAddRewardRateToMarketTrials20260416200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Idempotent: IF NOT EXISTS handles repeated runs safely
    await queryRunner.query(
      `ALTER TABLE market_trials ADD COLUMN IF NOT EXISTS "rewardRate" DECIMAL(5,2) NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE market_trials DROP COLUMN IF EXISTS "rewardRate"`,
    );
  }
}
