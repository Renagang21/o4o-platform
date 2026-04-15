import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-MARKET-TRIAL-CONVERSION-NOTIFICATION-V1
 * Adds notificationSentAt timestamp to market_trials for duplicate-send prevention.
 */
export class AddNotificationSentAtToMarketTrials20260415210000 implements MigrationInterface {
  name = 'AddNotificationSentAtToMarketTrials20260415210000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE market_trials
        ADD COLUMN IF NOT EXISTS "notificationSentAt" TIMESTAMP DEFAULT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE market_trials DROP COLUMN IF EXISTS "notificationSentAt"
    `);
  }
}
