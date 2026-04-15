import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-MARKET-TRIAL-LISTING-AUTOLINK-V1
 * Adds listingId (FK to organization_product_listings) to market_trial_participants.
 */
export class AddListingLinkToMarketTrialParticipants20260415230000 implements MigrationInterface {
  name = 'AddListingLinkToMarketTrialParticipants20260415230000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE market_trial_participants
        ADD COLUMN IF NOT EXISTS "listingId" UUID DEFAULT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE market_trial_participants DROP COLUMN IF EXISTS "listingId"
    `);
  }
}
