import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-CAMPAIGN-SIMPLIFICATION-V2
 *
 * Campaign을 "상품 단위 기간 특가"로 단순화:
 * 1. campaigns 테이블에 product_id + campaign_price 컬럼 추가
 * 2. 기존 campaign_targets 데이터를 campaigns로 마이그레이션
 * 3. campaign_targets 테이블 DROP
 * 4. aggregations에서 target_id 제거, unique 변경
 * 5. Partial unique index: 동일 product_id에 ACTIVE 1개만 허용
 */
export class CampaignSimplification1740700820001 implements MigrationInterface {
  name = 'CampaignSimplification1740700820001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. campaigns 테이블에 product_id, campaign_price 추가 (nullable initially for migration)
    await queryRunner.query(`
      ALTER TABLE neture_time_limited_price_campaigns
        ADD COLUMN IF NOT EXISTS product_id UUID,
        ADD COLUMN IF NOT EXISTS campaign_price INT
    `);

    // 2. 기존 targets → campaigns 데이터 복사 (첫 번째 target 기준)
    await queryRunner.query(`
      UPDATE neture_time_limited_price_campaigns c
      SET product_id = ct.product_id,
          campaign_price = ct.campaign_price
      FROM (
        SELECT DISTINCT ON (campaign_id) campaign_id, product_id, campaign_price
        FROM neture_campaign_targets
        ORDER BY campaign_id, created_at ASC
      ) ct
      WHERE c.id = ct.campaign_id
    `);

    // 3. targets가 없는 캠페인에 기본값 설정 (혹시 빈 캠페인이 있을 경우)
    await queryRunner.query(`
      UPDATE neture_time_limited_price_campaigns
      SET product_id = '00000000-0000-0000-0000-000000000000',
          campaign_price = 0
      WHERE product_id IS NULL
    `);

    // 4. NOT NULL 제약 추가
    await queryRunner.query(`
      ALTER TABLE neture_time_limited_price_campaigns
        ALTER COLUMN product_id SET NOT NULL,
        ALTER COLUMN campaign_price SET NOT NULL
    `);

    // 5. product_id 인덱스 추가
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_campaign_product_id
      ON neture_time_limited_price_campaigns (product_id)
    `);

    // 6. 핵심: Partial unique index — 동일 product_id에 ACTIVE 캠페인 1개만
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_active_campaign_per_product
      ON neture_time_limited_price_campaigns (product_id)
      WHERE status = 'ACTIVE'
    `);

    // 7. aggregations: target_id 제거 전 unique 변경
    await queryRunner.query(`
      ALTER TABLE neture_campaign_aggregations
        DROP CONSTRAINT IF EXISTS neture_campaign_aggregations_campaign_id_target_id_key
    `);
    // TypeORM @Unique decorator로 생성된 제약도 제거
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_neture_campaign_aggregations_campaign_id_target_id"
    `);

    // 새 unique: (campaign_id, product_id)
    await queryRunner.query(`
      ALTER TABLE neture_campaign_aggregations
        DROP COLUMN IF EXISTS target_id
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_campaign_aggregation_product
      ON neture_campaign_aggregations (campaign_id, product_id)
    `);

    // 8. campaign_targets 테이블 DROP
    await queryRunner.query(`DROP TABLE IF EXISTS neture_campaign_targets`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate campaign_targets
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

    // Restore aggregations target_id
    await queryRunner.query(`
      ALTER TABLE neture_campaign_aggregations
        ADD COLUMN IF NOT EXISTS target_id UUID
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS uq_campaign_aggregation_product
    `);

    // Remove new columns from campaigns
    await queryRunner.query(`DROP INDEX IF EXISTS uq_active_campaign_per_product`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_campaign_product_id`);
    await queryRunner.query(`
      ALTER TABLE neture_time_limited_price_campaigns
        DROP COLUMN IF EXISTS product_id,
        DROP COLUMN IF EXISTS campaign_price
    `);
  }
}
