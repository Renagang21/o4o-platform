import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-MARKET-TRIAL-TO-PRODUCT-CONVERSION-FLOW-V1
 * Add product conversion tracking fields to market_trials
 */
export class AddConversionFieldsToMarketTrials20260415200000 implements MigrationInterface {
  name = 'AddConversionFieldsToMarketTrials20260415200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE market_trials
        ADD COLUMN IF NOT EXISTS "convertedProductId" uuid,
        ADD COLUMN IF NOT EXISTS "convertedProductName" varchar(500),
        ADD COLUMN IF NOT EXISTS "conversionNote" text
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE market_trials
        DROP COLUMN IF EXISTS "convertedProductId",
        DROP COLUMN IF EXISTS "convertedProductName",
        DROP COLUMN IF EXISTS "conversionNote"
    `);
  }
}
