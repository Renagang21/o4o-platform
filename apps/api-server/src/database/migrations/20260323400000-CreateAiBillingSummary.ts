import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-AI-BILLING-DATA-SYSTEM-V1
 *
 * ai_billing_summary: 월별 AI 서비스 정산 데이터
 */
export class CreateAiBillingSummary20260323400000 implements MigrationInterface {
  name = 'CreateAiBillingSummary20260323400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_billing_summary (
        id SERIAL PRIMARY KEY,
        period VARCHAR(7) NOT NULL,
        service_key VARCHAR(20) NOT NULL,
        total_requests INT NOT NULL DEFAULT 0,
        total_tokens INT NOT NULL DEFAULT 0,
        total_cost NUMERIC(15,4) NOT NULL DEFAULT 0,
        adjustment_amount NUMERIC(15,4) NOT NULL DEFAULT 0,
        final_cost NUMERIC(15,4) NOT NULL DEFAULT 0,
        status VARCHAR(10) NOT NULL DEFAULT 'draft',
        note TEXT,
        generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        confirmed_at TIMESTAMPTZ,
        paid_at TIMESTAMPTZ,
        CONSTRAINT uq_ai_billing_period_service UNIQUE (period, service_key)
      );

      CREATE INDEX IF NOT EXISTS idx_ai_billing_status ON ai_billing_summary (status);
      CREATE INDEX IF NOT EXISTS idx_ai_billing_period ON ai_billing_summary (period);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS ai_billing_summary;`);
  }
}
