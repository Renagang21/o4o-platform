import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-AI-COST-LIMIT-QUOTA-V1
 *
 * ai_usage_quota: 사용량 제한 정의
 * ai_usage_aggregate: 사용량 집계 카운터
 * + 기본 글로벌 quota seed
 */
export class CreateAiQuotaTables20260323300000 implements MigrationInterface {
  name = 'CreateAiQuotaTables20260323300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      -- ai_usage_quota: 사용량 제한 정의
      CREATE TABLE IF NOT EXISTS ai_usage_quota (
        id SERIAL PRIMARY KEY,
        layer VARCHAR(20) NOT NULL,
        layer_key VARCHAR(100) NOT NULL,
        limit_type VARCHAR(20) NOT NULL,
        period VARCHAR(10) NOT NULL,
        limit_value NUMERIC(15,4) NOT NULL,
        warning_threshold INT NOT NULL DEFAULT 80,
        is_enabled BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_ai_usage_quota UNIQUE (layer, layer_key, limit_type, period)
      );

      -- ai_usage_aggregate: 사용량 집계 카운터
      CREATE TABLE IF NOT EXISTS ai_usage_aggregate (
        id SERIAL PRIMARY KEY,
        layer VARCHAR(20) NOT NULL,
        layer_key VARCHAR(100) NOT NULL,
        limit_type VARCHAR(20) NOT NULL,
        period_key VARCHAR(10) NOT NULL,
        current_value NUMERIC(15,4) NOT NULL DEFAULT 0,
        last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_ai_usage_aggregate UNIQUE (layer, layer_key, limit_type, period_key)
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_ai_usage_quota_lookup
        ON ai_usage_quota (layer, layer_key, is_enabled);
      CREATE INDEX IF NOT EXISTS idx_ai_usage_aggregate_lookup
        ON ai_usage_aggregate (layer, layer_key, period_key);

      -- 기본 글로벌 quota seed
      INSERT INTO ai_usage_quota (layer, layer_key, limit_type, period, limit_value, warning_threshold)
      VALUES
        ('global', '*', 'requests', 'daily', 5000, 80),
        ('global', '*', 'tokens', 'daily', 5000000, 80),
        ('global', '*', 'cost', 'daily', 50, 80),
        ('global', '*', 'requests', 'monthly', 100000, 80),
        ('global', '*', 'cost', 'monthly', 1000, 80)
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS ai_usage_aggregate;
      DROP TABLE IF EXISTS ai_usage_quota;
    `);
  }
}
