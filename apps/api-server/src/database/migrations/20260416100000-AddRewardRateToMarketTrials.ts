import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-MARKET-TRIAL-CROWDFUNDING-CORE-ALIGNMENT-V1
 *
 * Adds reward_rate column to market_trials.
 * rewardRate: % 기반 보상 비율 (예: 5 = 참여금의 5% 추가 환원)
 */
export class AddRewardRateToMarketTrials20260416100000 implements MigrationInterface {
  name = 'AddRewardRateToMarketTrials20260416100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE market_trials ADD COLUMN IF NOT EXISTS reward_rate DECIMAL(5,2) NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE market_trials DROP COLUMN IF EXISTS reward_rate`,
    );
  }
}
