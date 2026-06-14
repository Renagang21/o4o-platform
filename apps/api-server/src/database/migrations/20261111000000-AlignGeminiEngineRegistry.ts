/**
 * Migration: Align AI engine registry to canonical Gemini 2.5 candidates
 * WO-O4O-AI-ENGINE-REGISTRY-CANDIDATE-SEED-V1
 *
 * 기존 prod 의 ai_engines 는 구 seed(`gemini-2.0-flash` active + 무효 `gemini-3.0-flash`)
 * 로 채워져 있을 수 있다. 본 migration 은:
 *   1. 2.5 계열 후보(flash / pro / flash-lite)를 idempotent upsert (is_available=true)
 *   2. legacy `gemini-2.0-flash` 는 보존하되 정렬만 뒤로
 *   3. 무효 id `gemini-3.0-flash` 제거
 *   4. is_active 를 현재 운영 모델(`ai_query_policy.default_model`)에 정합 — 없으면 gemini-2.5-flash
 *      (편집 AI 모델은 default_model 로 결정되므로 실제 모델은 바뀌지 않고 registry 표시만 일치)
 *   5. active_engine_id 포인터 동기화
 *
 * 안전: additive/idempotent. default_model(운영 모델) 은 변경하지 않는다.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignGeminiEngineRegistry20261111000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 2.5 계열 후보 upsert (is_active 는 건드리지 않음 — 4단계에서 정합)
    await queryRunner.query(`
      INSERT INTO ai_engines (slug, name, description, provider, is_active, is_available, sort_order)
      VALUES
        ('gemini-2.5-flash', 'Gemini 2.5 Flash', '빠른 응답 속도와 비용 효율적인 기본 운영 모델.', 'google', false, true, 1),
        ('gemini-2.5-pro', 'Gemini 2.5 Pro', '향상된 추론 능력과 응답 품질을 제공하는 상위 모델.', 'google', false, true, 2),
        ('gemini-2.5-flash-lite', 'Gemini 2.5 Flash-Lite', '최저가·저지연 모델. POP/QR 등 짧은 문구 생성에 적합합니다.', 'google', false, true, 3)
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        provider = EXCLUDED.provider,
        is_available = true,
        sort_order = EXCLUDED.sort_order,
        updated_at = CURRENT_TIMESTAMP
    `);

    // 2. legacy gemini-2.0-flash 보존(정렬만 뒤로)
    await queryRunner.query(`
      UPDATE ai_engines SET sort_order = 4 WHERE slug = 'gemini-2.0-flash'
    `);

    // 3. 무효 id 제거
    await queryRunner.query(`
      DELETE FROM ai_engines WHERE slug = 'gemini-3.0-flash'
    `);

    // 4. is_active 정합: 현재 default_model(있고 engine 존재 시) → 아니면 gemini-2.5-flash
    await queryRunner.query(`UPDATE ai_engines SET is_active = false`);
    await queryRunner.query(`
      UPDATE ai_engines SET is_active = true
      WHERE slug = COALESCE(
        (SELECT p.default_model FROM ai_query_policy p
           WHERE p.id = 1 AND p.default_model IN (SELECT slug FROM ai_engines)),
        'gemini-2.5-flash'
      )
    `);

    // 5. active_engine_id 포인터 동기화
    await queryRunner.query(`
      UPDATE ai_query_policy
      SET active_engine_id = (SELECT id FROM ai_engines WHERE is_active = true LIMIT 1)
      WHERE id = 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // best-effort 역행: 추가한 flash-lite 제거 + 무효 id 복원(원상). active 플립은 복원하지 않음.
    await queryRunner.query(`
      DELETE FROM ai_engines WHERE slug = 'gemini-2.5-flash-lite'
    `);
    await queryRunner.query(`
      INSERT INTO ai_engines (slug, name, description, provider, is_active, is_available, sort_order)
      VALUES ('gemini-3.0-flash', 'Gemini 3.0 Flash', '최신 Gemini 모델.', 'google', false, true, 2)
      ON CONFLICT (slug) DO NOTHING
    `);
  }
}
