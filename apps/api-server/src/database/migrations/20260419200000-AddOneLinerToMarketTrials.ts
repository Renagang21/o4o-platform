import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-MARKET-TRIAL-PROPOSAL-STRUCTURE-V1
 * Add oneLiner (varchar 120) column to market_trials
 */
export class AddOneLinerToMarketTrials20260419200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "market_trials" ADD COLUMN IF NOT EXISTS "oneLiner" varchar(120)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "market_trials" DROP COLUMN IF EXISTS "oneLiner"`,
    );
  }
}
