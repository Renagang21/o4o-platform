import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-TIME-LIMITED-PRICE-CAMPAIGN-V1
 *
 * 기간 한정 가격 캠페인 3 테이블 생성:
 * - neture_time_limited_price_campaigns: 캠페인 정의
 * - neture_campaign_targets: 캠페인 대상 상품 + 가격 오버라이드
 * - neture_campaign_aggregations: 캠페인 실적 집계
 */
export class NetureTimeLimitedPriceCampaign1740700810001 implements MigrationInterface {
  name = 'NetureTimeLimitedPriceCampaign1740700810001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create campaign status enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE neture_campaign_status AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$
    `);

    // Table 1: neture_time_limited_price_campaigns
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS neture_time_limited_price_campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        description TEXT,
        supplier_id UUID NOT NULL,
        status neture_campaign_status NOT NULL DEFAULT 'DRAFT',
        start_at TIMESTAMPTZ NOT NULL,
        end_at TIMESTAMPTZ NOT NULL,
        created_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_campaign_supplier_id ON neture_time_limited_price_campaigns (supplier_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_campaign_status ON neture_time_limited_price_campaigns (status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_campaign_date_range ON neture_time_limited_price_campaigns (start_at, end_at)`);

    // Table 2: neture_campaign_targets
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS neture_campaign_targets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES neture_time_limited_price_campaigns(id) ON DELETE CASCADE,
        product_id UUID NOT NULL,
        campaign_price INT NOT NULL,
        organization_id UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (campaign_id, product_id, organization_id)
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_campaign_target_campaign_id ON neture_campaign_targets (campaign_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_campaign_target_product_id ON neture_campaign_targets (product_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_campaign_target_org_id ON neture_campaign_targets (organization_id)`);

    // Table 3: neture_campaign_aggregations
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS neture_campaign_aggregations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL,
        target_id UUID NOT NULL,
        product_id UUID NOT NULL,
        organization_id UUID,
        total_orders INT NOT NULL DEFAULT 0,
        total_quantity INT NOT NULL DEFAULT 0,
        total_amount BIGINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (campaign_id, target_id)
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_campaign_agg_campaign_id ON neture_campaign_aggregations (campaign_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_campaign_agg_target_id ON neture_campaign_aggregations (target_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS neture_campaign_aggregations`);
    await queryRunner.query(`DROP TABLE IF EXISTS neture_campaign_targets`);
    await queryRunner.query(`DROP TABLE IF EXISTS neture_time_limited_price_campaigns`);
    await queryRunner.query(`DROP TYPE IF EXISTS neture_campaign_status`);
  }
}
