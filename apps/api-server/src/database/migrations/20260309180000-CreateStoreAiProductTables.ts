import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PRODUCT-STORE-AI-INSIGHT-V1
 *
 * 1. store_ai_product_snapshots — 상품별 KPI 스냅샷 (일별 1회, org+product+date unique)
 * 2. store_ai_product_insights — LLM 생성 상품 인사이트 (일별 1회, org+date unique)
 */
export class CreateStoreAiProductTables1709309180000 implements MigrationInterface {
  name = 'CreateStoreAiProductTables20260309180000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. store_ai_product_snapshots
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS store_ai_product_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        product_id UUID NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        snapshot_date DATE NOT NULL,
        period_days INT NOT NULL DEFAULT 7,
        qr_scans INT NOT NULL DEFAULT 0,
        orders INT NOT NULL DEFAULT 0,
        revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
        conversion_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
        content_views INT NOT NULL DEFAULT 0,
        signage_views INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (organization_id, product_id, snapshot_date)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_store_ai_product_snapshots_org_id
      ON store_ai_product_snapshots (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_store_ai_product_snapshots_product_id
      ON store_ai_product_snapshots (product_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_store_ai_product_snapshots_date
      ON store_ai_product_snapshots (snapshot_date)
    `);

    // 2. store_ai_product_insights
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS store_ai_product_insights (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        snapshot_date DATE NOT NULL,
        summary TEXT NOT NULL,
        product_highlights JSONB NOT NULL DEFAULT '[]',
        issues JSONB NOT NULL DEFAULT '[]',
        actions JSONB NOT NULL DEFAULT '[]',
        model VARCHAR(100) NOT NULL,
        prompt_tokens INT NOT NULL DEFAULT 0,
        completion_tokens INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (organization_id, snapshot_date)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_store_ai_product_insights_org_id
      ON store_ai_product_insights (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_store_ai_product_insights_date
      ON store_ai_product_insights (snapshot_date)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS store_ai_product_insights`);
    await queryRunner.query(`DROP TABLE IF EXISTS store_ai_product_snapshots`);
  }
}
