import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-MARKET-TRIAL-PARTICIPANT-TO-CUSTOMER-FLOW-V1
 * Adds customer conversion pipeline fields to market_trial_participants.
 */
export class AddCustomerConversionToMarketTrialParticipants20260415220000 implements MigrationInterface {
  name = 'AddCustomerConversionToMarketTrialParticipants20260415220000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE market_trial_participants
        ADD COLUMN IF NOT EXISTS "customerConversionStatus" VARCHAR(30) NOT NULL DEFAULT 'none',
        ADD COLUMN IF NOT EXISTS "customerConversionAt"     TIMESTAMP        DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "customerConversionNote"   TEXT             DEFAULT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE market_trial_participants
        DROP COLUMN IF EXISTS "customerConversionStatus",
        DROP COLUMN IF EXISTS "customerConversionAt",
        DROP COLUMN IF EXISTS "customerConversionNote"
    `);
  }
}
