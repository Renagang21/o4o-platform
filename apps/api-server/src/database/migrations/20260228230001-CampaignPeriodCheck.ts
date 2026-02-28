/**
 * WO-NETURE-CAMPAIGN-INTEGRITY-FIX-V3
 * 기간 역전 방지 — DB CHECK constraint
 * start_at < end_at 강제.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CampaignPeriodCheck1740783601000 implements MigrationInterface {
  name = 'CampaignPeriodCheck1740783601000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE neture_time_limited_price_campaigns
      ADD CONSTRAINT chk_campaign_period CHECK (start_at < end_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE neture_time_limited_price_campaigns
      DROP CONSTRAINT IF EXISTS chk_campaign_period
    `);
  }
}
