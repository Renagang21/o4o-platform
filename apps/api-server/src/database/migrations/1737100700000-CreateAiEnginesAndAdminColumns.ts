/**
 * Migration: Create AI Engines table and add admin columns to AI Query Policy
 * WO-AI-ADMIN-CONTROL-PLANE-V1
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAiEnginesAndAdminColumns1737100700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // 1. Create ai_engines table
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_engines (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        provider VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT false,
        is_available BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ============================================================
    // 2. Add new columns to ai_query_policy (if they don't exist)
    // ============================================================

    // Check if columns exist before adding
    const tableInfo = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'ai_query_policy'
    `);
    const existingColumns = tableInfo.map((row: any) => row.column_name);

    if (!existingColumns.includes('warning_threshold')) {
      await queryRunner.query(`
        ALTER TABLE ai_query_policy
        ADD COLUMN warning_threshold INTEGER DEFAULT 80
      `);
    }

    if (!existingColumns.includes('global_daily_limit')) {
      await queryRunner.query(`
        ALTER TABLE ai_query_policy
        ADD COLUMN global_daily_limit INTEGER DEFAULT 1000
      `);
    }

    if (!existingColumns.includes('active_engine_id')) {
      await queryRunner.query(`
        ALTER TABLE ai_query_policy
        ADD COLUMN active_engine_id INTEGER
      `);
    }

    // ============================================================
    // 3. Seed default engines
    // ============================================================
    const existingEngines = await queryRunner.query(`
      SELECT COUNT(*) as count FROM ai_engines
    `);

    if (parseInt(existingEngines[0].count, 10) === 0) {
      await queryRunner.query(`
        INSERT INTO ai_engines (slug, name, description, provider, is_active, is_available, sort_order)
        VALUES
          ('gemini-2.0-flash', 'Gemini 2.0 Flash', '빠른 응답 속도와 비용 효율적인 모델. 일반적인 질의에 적합합니다.', 'google', true, true, 1),
          ('gemini-3.0-flash', 'Gemini 3.0 Flash', '최신 Gemini 모델. 향상된 추론 능력과 응답 품질을 제공합니다.', 'google', false, true, 2)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns from ai_query_policy
    await queryRunner.query(`
      ALTER TABLE ai_query_policy
      DROP COLUMN IF EXISTS warning_threshold
    `);
    await queryRunner.query(`
      ALTER TABLE ai_query_policy
      DROP COLUMN IF EXISTS global_daily_limit
    `);
    await queryRunner.query(`
      ALTER TABLE ai_query_policy
      DROP COLUMN IF EXISTS active_engine_id
    `);

    // Drop ai_engines table
    await queryRunner.query(`DROP TABLE IF EXISTS ai_engines`);
  }
}
