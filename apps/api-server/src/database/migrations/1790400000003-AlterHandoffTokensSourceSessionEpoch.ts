import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * handoff 원장에 **출발 서비스 세대**를 보관한다
 *
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8 (3차 리뷰)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 막는 것: 로그아웃 **전에** 받아 둔 handoff 토큰을 로그아웃 **뒤** TTL(60초) 안에 교환해
 * 수명이 긴 세션을 새로 얻는 경로.
 *
 * 기존 교환 검사는 `users.refreshTokenFamily`(사용자 전체)만 봤다. 서비스 하나의 로그아웃은
 * 그 값을 유지하므로 이 경로가 열려 있었다.
 *
 * 발급 시점의 출발 서비스 세대를 여기 남기고, 교환 시 현재 세대와 비교한다.
 * `created_at` 시각 비교를 쓰지 않는 이유는 §8 과 같다 — 초 단위 값으로는 같은 초의 선후를
 * 알 수 없다. 세대는 단조 증가하므로 시각이 같아도 갈린다.
 *
 * NULL 을 허용한다: 이 컬럼 이전에 발급된 토큰은 값이 없고, TTL 이 60초이므로 배포 직후
 * 1분만 지나면 남지 않는다. 그 동안은 판정에서 제외한다(종전 동작 유지).
 */
export class AlterHandoffTokensSourceSessionEpoch1790400000003 implements MigrationInterface {
  name = 'AlterHandoffTokensSourceSessionEpoch1790400000003';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE handoff_tokens ADD COLUMN source_session_epoch integer`);
    await q.query(`COMMENT ON COLUMN handoff_tokens.source_session_epoch IS
      '발급 시점의 출발 서비스 session_epoch — 교환 시 현재 세대와 비교(WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8)'`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE handoff_tokens DROP COLUMN IF EXISTS source_session_epoch`);
  }
}
