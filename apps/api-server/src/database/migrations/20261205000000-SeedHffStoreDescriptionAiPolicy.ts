import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-APPLY-EXECUTE-V1 (additive seed)
 *
 * 건강기능식품 매장 설명 생성용 AI policy scope 를 ai_llm_policies 에 seed 한다.
 * scope = HEALTH_FUNCTIONAL_FOOD_STORE_DESCRIPTION (코드 union/SERVICE_FOR_SCOPE 와 일치).
 *
 * 불변: 다른 scope row / 기존 정책 변경하지 않음. ON CONFLICT(scope) DO NOTHING (멱등).
 *
 * 기본값 근거:
 *   - provider/model: 현재 운영 기본(gemini / gemini-2.5-flash, ai-policy 하드코딩 fallback 과 동일)
 *   - temperature 0.2: 규제 텍스트 생성 — 낮은 창의성(원문 이탈 최소화)
 *   - response_mode json: prompt 가 JSON 스키마 출력을 요구
 *   - timeout 30s: 멀티정제(긴 mainFunction) 입력 대비 (기본 10s 보다 여유)
 *   - retry: content scope 관례(2회)
 * 실제 운영 조정(모델/비용)은 admin AI policy 또는 후속 보정 migration 으로 한다.
 */
export class SeedHffStoreDescriptionAiPolicy20261205000000 implements MigrationInterface {
  name = 'SeedHffStoreDescriptionAiPolicy20261205000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO ai_llm_policies
        (scope, provider, model, temperature, max_tokens, timeout_ms, response_mode, retry_max, retry_delay_ms, is_enabled)
      VALUES
        ('HEALTH_FUNCTIONAL_FOOD_STORE_DESCRIPTION', 'gemini', 'gemini-2.5-flash', 0.2, 2048, 30000, 'json', 2, 2000, true)
      ON CONFLICT (scope) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM ai_llm_policies WHERE scope = 'HEALTH_FUNCTIONAL_FOOD_STORE_DESCRIPTION'`,
    );
  }
}
