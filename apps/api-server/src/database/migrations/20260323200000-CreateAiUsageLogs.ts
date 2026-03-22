import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-AI-USAGE-DASHBOARD-V1
 *
 * ai_usage_logs 테이블 생성 + scope/costEstimated 컬럼 추가.
 * Idempotent: IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
 */
export class CreateAiUsageLogs20260323200000 implements MigrationInterface {
  name = 'CreateAiUsageLogs20260323200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[MIGRATION] CreateAiUsageLogs - Starting...');

    // Step 1: Create enums (idempotent)
    await queryRunner.query(`
      DO $$ BEGIN CREATE TYPE ai_provider_enum AS ENUM ('openai','gemini','claude');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN CREATE TYPE ai_usage_status_enum AS ENUM ('success','error');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // Step 2: Create table (idempotent)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_usage_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID,
        provider ai_provider_enum NOT NULL,
        model VARCHAR(100) NOT NULL,
        scope VARCHAR(100),
        "requestId" UUID,
        "promptTokens" INT,
        "completionTokens" INT,
        "totalTokens" INT,
        "costEstimated" NUMERIC(10,6),
        "durationMs" INT,
        status ai_usage_status_enum NOT NULL,
        "errorMessage" TEXT,
        "errorType" VARCHAR(100),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Step 3: Add columns if missing (for existing tables)
    await queryRunner.query(`ALTER TABLE ai_usage_logs ADD COLUMN IF NOT EXISTS scope VARCHAR(100);`);
    await queryRunner.query(`ALTER TABLE ai_usage_logs ADD COLUMN IF NOT EXISTS "costEstimated" NUMERIC(10,6);`);

    // Step 4: Make userId nullable (idempotent)
    await queryRunner.query(`ALTER TABLE ai_usage_logs ALTER COLUMN "userId" DROP NOT NULL;`);

    // Step 5: Indexes (idempotent)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_usage_scope ON ai_usage_logs(scope, "createdAt");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_usage_provider ON ai_usage_logs(provider, "createdAt");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_usage_status ON ai_usage_logs(status, "createdAt");`);

    console.log('[MIGRATION] ai_usage_logs table ready');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_usage_scope;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_usage_provider;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_usage_status;`);
    await queryRunner.query(`DROP TABLE IF EXISTS ai_usage_logs;`);
    console.log('[MIGRATION] ai_usage_logs table dropped');
  }
}
