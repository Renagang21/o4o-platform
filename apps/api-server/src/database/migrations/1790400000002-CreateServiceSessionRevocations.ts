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
 * 그 칸을 손대지 않고 서비스 축을 **따로** 둔다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 판정은 **시각이 아니라 세대(`session_epoch`)** 다
 *
 * 처음에는 `revoked_at` 과 토큰의 `iat` 를 비교했다. **그 설계는 틀렸다.**
 * JWT `iat` 는 **초 단위**이고 `revoked_at` 은 그보다 정밀하다. 그래서
 *
 *   · 로그아웃한 **같은 초에 다시 로그인**하면 새 토큰도 `iat < revoked_at` 이라 거절된다
 *   · 반대로 같은 초의 **기존 토큰과 새 토큰을 `iat` 만으로 구별할 수 없다**
 *
 * 두 번째가 본질이다 — 초 단위 값으로는 같은 초 안의 선후를 알 수 없으므로 어느 쪽으로
 * 맞춰도 한쪽이 틀린다. 그래서 시간 비교를 버리고 **단조 증가하는 세대 번호**를 쓴다.
 *
 *   `session_epoch`  이 (user, service) 가 로그아웃된 횟수
 *   발급 시          그 시점의 epoch 를 토큰에 새긴다
 *   로그아웃 시       epoch += 1
 *   refresh 판정      token.epoch < 현재 epoch  →  거절
 *
 * 같은 초에 로그아웃 → 재로그인 해도 새 토큰은 증가된 epoch 를 갖고, 직전 토큰은 옛 epoch 를
 * 갖는다. 시각이 같아도 두 토큰이 구별된다.
 *
 * `revoked_at` 은 **감사·정리용**으로만 남긴다(판정에 쓰지 않는다).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 `users` 에 컬럼을 더하지 않는가: 서비스 수만큼 컬럼이 늘어나고, 서비스 추가가 곧 스키마
 * 변경이 된다. 행으로 두면 새 서비스 키가 스키마를 건드리지 않는다.
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
      session_epoch integer NOT NULL DEFAULT 0,
      revoked_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, service_key),
      CONSTRAINT chk_ssr_epoch_nonnegative CHECK (session_epoch >= 0)
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
