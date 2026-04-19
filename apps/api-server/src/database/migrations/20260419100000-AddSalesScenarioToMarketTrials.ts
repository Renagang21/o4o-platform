import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-MARKET-TRIAL-SALES-SCENARIO-EDITOR-V1
 * Add salesScenarioContent (rich HTML) column to market_trials
 */
export class AddSalesScenarioToMarketTrials20260419100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "market_trials" ADD COLUMN IF NOT EXISTS "salesScenarioContent" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "market_trials" DROP COLUMN IF EXISTS "salesScenarioContent"`,
    );
  }
}
