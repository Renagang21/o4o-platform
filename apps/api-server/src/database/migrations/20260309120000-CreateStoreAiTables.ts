import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-HUB-AI-SUMMARY-V1
 *
 * 1. store_ai_snapshots — 매장 KPI 스냅샷 (일별 1회, org+date unique)
 * 2. store_ai_insights — LLM 생성 인사이트 (snapshot 1:1)
 */
export class CreateStoreAiTables1709309120000 implements MigrationInterface {
  name = 'CreateStoreAiTables20260309120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. store_ai_snapshots
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS store_ai_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        snapshot_date DATE NOT NULL,
        period_days INT NOT NULL DEFAULT 7,
        data JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (organization_id, snapshot_date)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_store_ai_snapshots_org_id
      ON store_ai_snapshots (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_store_ai_snapshots_date
      ON store_ai_snapshots (snapshot_date)
    `);

    // 2. store_ai_insights
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS store_ai_insights (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        snapshot_id UUID NOT NULL UNIQUE,
        organization_id UUID NOT NULL,
        summary TEXT NOT NULL,
        issues JSONB NOT NULL DEFAULT '[]',
        actions JSONB NOT NULL DEFAULT '[]',
        model VARCHAR(100) NOT NULL,
        prompt_tokens INT NOT NULL DEFAULT 0,
        completion_tokens INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_store_ai_insights_snapshot_id
      ON store_ai_insights (snapshot_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_store_ai_insights_org_id
      ON store_ai_insights (organization_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS store_ai_insights`);
    await queryRunner.query(`DROP TABLE IF EXISTS store_ai_snapshots`);
  }
}
