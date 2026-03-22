import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-AI-POLICY-SYSTEM-V1
 *
 * Scope 기반 LLM 정책 테이블 생성 + 초기 seed.
 * 기존 ai_model_settings의 역할을 대체 (service 단위 → scope 단위).
 *
 * Idempotent: IF NOT EXISTS / ON CONFLICT DO NOTHING
 */
export class CreateAiLlmPolicies20260323100000 implements MigrationInterface {
  name = 'CreateAiLlmPolicies20260323100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[MIGRATION] CreateAiLlmPolicies - Starting...');

    // Step 1: Create table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai_llm_policies (
        id              SERIAL PRIMARY KEY,
        scope           VARCHAR(50) NOT NULL UNIQUE,
        provider        VARCHAR(20) NOT NULL DEFAULT 'gemini',
        model           VARCHAR(100) NOT NULL DEFAULT 'gemini-3.0-flash',
        temperature     NUMERIC(3,2) NOT NULL DEFAULT 0.30,
        max_tokens      INT NOT NULL DEFAULT 2048,
        top_p           NUMERIC(3,2),
        top_k           INT,
        timeout_ms      INT NOT NULL DEFAULT 10000,
        response_mode   VARCHAR(10) NOT NULL DEFAULT 'json',
        fallback_provider VARCHAR(20),
        fallback_model    VARCHAR(100),
        is_enabled      BOOLEAN NOT NULL DEFAULT true,
        retry_max       INT NOT NULL DEFAULT 2,
        retry_delay_ms  INT NOT NULL DEFAULT 2000,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('[MIGRATION] ai_llm_policies table created');

    // Step 2: Seed default policies
    await queryRunner.query(`
      INSERT INTO ai_llm_policies (scope, provider, model, temperature, max_tokens, timeout_ms, response_mode, retry_max, retry_delay_ms)
      VALUES
        ('CARE_CHAT',            'gemini', 'gemini-3.0-flash', 0.30,  2048,  10000, 'json', 2, 2000),
        ('CARE_INSIGHT',         'gemini', 'gemini-3.0-flash', 0.30,  2048,  10000, 'json', 2, 2000),
        ('CARE_COACHING',        'gemini', 'gemini-3.0-flash', 0.30,  2048,  10000, 'json', 2, 2000),
        ('CARE_PATIENT_INSIGHT', 'gemini', 'gemini-3.0-flash', 0.30,  2048,  10000, 'json', 2, 2000),
        ('STORE_INSIGHT',        'gemini', 'gemini-3.0-flash', 0.30,  2048,  10000, 'json', 2, 2000),
        ('PRODUCT_TAGGING',      'gemini', 'gemini-3.0-flash', 0.30,  1024,  10000, 'json', 2, 2000),
        ('STORE_PRODUCT_INSIGHT','gemini', 'gemini-3.0-flash', 0.30,  2048,  10000, 'json', 2, 2000),
        ('PRODUCT_CONTENT',      'gemini', 'gemini-3.0-flash', 0.30,  2048,  10000, 'json', 2, 2000),
        ('AI_PROXY',             'gemini', 'gemini-3.0-flash', 0.70, 32000, 120000, 'json', 3, 1000)
      ON CONFLICT (scope) DO NOTHING;
    `);
    console.log('[MIGRATION] ai_llm_policies seeded with 9 default scopes');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS ai_llm_policies;`);
    console.log('[MIGRATION] ai_llm_policies table dropped');
  }
}
