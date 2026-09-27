import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 서비스 단위 세션 폐기 원장
 *
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8 (S7 재작업)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 필요한가
 *
 * `users.refreshTokenFamily` 는 **사용자당 한 칸**이라 "이 사용자의 전체 세션" 만 표현한다.
 * 그래서 서비스 하나의 로그아웃을 서버에서 실현할 수단이 없었고, 종전 `logout` 은
 * 그 한 칸을 비워 **9개 주소를 한꺼번에** 끊었다(= logout-all 과 동일).
 *
 * 그 칸을 손대지 않고 서비스 축을 **따로** 둔다. 여기 한 행은
 * "이 사용자의 이 서비스 세션은 `revoked_at` 이전에 발급된 것까지 무효" 를 뜻한다.
 * refresh 는 토큰의 `iat` 를 이 값과 비교해 거절한다.
 *
 *   logout(serviceKey)  이 표의 그 서비스 행만 갱신 → 다른 서비스 세션은 살아 있다
 *   logout-all          users.refreshTokenFamily = null (종전 계약 불변) → 전부 무효
 *
 * 왜 `users` 에 컬럼을 더하지 않는가: 서비스 수만큼 컬럼이 늘어나고, 서비스 추가가
 * 곧 스키마 변경이 된다. 행으로 두면 새 서비스 키가 스키마를 건드리지 않는다.
 *
 * 왜 세션별이 아니라 서비스별인가: 기기·세션 레코드가 없는 현재 모델에서 "세션 하나" 를
 * 식별할 수 있는 축이 없다. 서비스는 토큰 claim 으로 식별할 수 있는 **가장 좁은 축**이다.
 */
export class CreateServiceSessionRevocations1790400000002 implements MigrationInterface {
  name = 'CreateServiceSessionRevocations1790400000002';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE service_session_revocations (
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      service_key varchar(64) NOT NULL,
      revoked_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, service_key)
    )`);

    // refresh 경로가 매 요청 (user_id, service_key) 단건 조회만 하므로 PK 로 충분하다.
    // 정리 배치가 오래된 행을 지울 때를 위해 시각 인덱스만 둔다.
    await q.query(
      `CREATE INDEX idx_service_session_revocations_revoked_at
         ON service_session_revocations (revoked_at)`,
    );
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS service_session_revocations`);
  }
}
