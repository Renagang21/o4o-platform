import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-MARKET-TRIAL-VIDEO-FIELD-V1
 * Add videoUrl (varchar 500) column to market_trials
 */
export class AddVideoUrlToMarketTrials20260419300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "market_trials" ADD COLUMN IF NOT EXISTS "videoUrl" varchar(500)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "market_trials" DROP COLUMN IF EXISTS "videoUrl"`,
    );
  }
}
