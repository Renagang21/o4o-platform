import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * handoff 원장에 **출발 세션의 인증 수단**을 보관한다
 *
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 (배포 전 최종 보완 1)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 막는 것: 비밀번호 세션이 handoff 를 거치며 Google 세션(수단 표식 없음)으로 **승격**되는 경로.
 *
 * 발급 시점에 서버가 검증한 access token 의 `authMethod` 를 여기 남기고, 교환 후 세션은 이 값을
 * 승계한다. 교환 시점의 Google 연결 여부 · 역할로 수단을 추정하지 않는다.
 *
 * NULL 을 허용한다: 이 컬럼 이전에 발급된 토큰은 값이 없고 TTL 이 60초이므로 배포 직후 1분이면
 * 남지 않는다. 교환 측은 NULL 을 비밀번호 세션으로 취급한다(fail-closed · 승격 없음).
 */
export class AddHandoffTokenSourceAuthMethod1790684000000 implements MigrationInterface {
  name = 'AddHandoffTokenSourceAuthMethod1790684000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE handoff_tokens ADD COLUMN source_auth_method varchar(16)`);
    await q.query(`ALTER TABLE handoff_tokens ADD CONSTRAINT chk_handoff_source_auth_method
      CHECK (source_auth_method IS NULL OR source_auth_method IN ('google', 'password'))`);
    await q.query(`COMMENT ON COLUMN handoff_tokens.source_auth_method IS
      '발급 시점 출발 세션의 인증 수단(google|password) — 교환 세션이 승계, NULL 은 password 취급(WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1)'`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE handoff_tokens DROP CONSTRAINT IF EXISTS chk_handoff_source_auth_method`);
    await q.query(`ALTER TABLE handoff_tokens DROP COLUMN IF EXISTS source_auth_method`);
  }
}
