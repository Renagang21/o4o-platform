import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 이메일·비밀번호 인증 저장 구조 — **신규** 3테이블
 *
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 §2 (사용자 승인 2026-09-29)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 되살리는 것이 아니라 새로 만든다
 *
 *   `DropLegacyPasswordAuthSchema1790251584623`(2026-09-24)이 `service_credentials` ·
 *   `password_reset_tokens` · `users` 의 password/재설정/lockout 컬럼 5개를 물리 삭제했다.
 *   그 migration 의 `down()` 은 구조만 되돌리며 데이터는 복구되지 않는다 — 그래서 **`down()` 을
 *   쓰지 않고** 현재 구조에 맞는 형태로 새로 만든다.
 *
 *   ① `users` 에 컬럼을 다시 붙이지 않는다.
 *      Identity V3 의 "최소 User" 와 `linked_accounts` 패턴에 맞춰 **인증 수단을 별도 행**으로 둔다.
 *      수단 추가·해지가 `users` 행을 건드리지 않고, 수단 보유 여부가 곧 행 존재 여부다.
 *   ② 옛 서비스별 password 축(`service_credentials`)을 재현하지 않는다.
 *      로그인은 플랫폼 계정 하나(`users.id`)이고, 서비스 가입·권한은 별개 축이다.
 *   ③ 토큰은 **해시만** 저장한다. 평문은 메일 링크에만 실리고 DB·로그에 남지 않는다.
 *      1회용은 `consumed_at` 으로 물리 보장한다(선례: `handoff_tokens`).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이메일은 로그인 아이디, 계정 식별자는 `users.id`
 *
 *   세 테이블 모두 `users.id` 를 FK 로 잡는다. 이메일 문자열을 키로 쓰지 않는다 —
 *   주소가 바뀌어도 계정은 같아야 하고, 중복 판정은 `IDX_users_email`(UNIQUE)이 이미 한다.
 *   `email_verification_tokens.email` 은 "이 토큰이 확인하려는 주소" 이며(가입 확인과 주소 변경
 *   확인이 같은 테이블을 쓴다) 식별자가 아니다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 안전 장치
 *
 *   `chk_upc_hash_len` — 해시 길이 하한. 평문이나 짧은 다이제스트가 들어오면 **DB 가 거절**한다.
 *   애플리케이션 버그를 조용히 통과시키지 않기 위한 마지막 방어선이다(정책 검사는 코드에 있다).
 *   `ON DELETE CASCADE` — 계정 삭제 시 인증 수단·토큰이 남지 않는다(orphan 0).
 */
export class CreateEmailPasswordAuthTables1790683000000 implements MigrationInterface {
  name = 'CreateEmailPasswordAuthTables1790683000000';

  public async up(q: QueryRunner): Promise<void> {
    // ── 1. 비밀번호 수단 — 한 사용자에 최대 1행 ────────────────────────────
    await q.query(`
      CREATE TABLE user_password_credentials (
        user_id uuid NOT NULL,
        password_hash character varying(255) NOT NULL,
        algo character varying(32) NOT NULL DEFAULT 'bcrypt',
        password_changed_at timestamp without time zone NOT NULL DEFAULT now(),
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        updated_at timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT pk_user_password_credentials PRIMARY KEY (user_id),
        CONSTRAINT fk_upc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT chk_upc_hash_len CHECK (length(password_hash) >= 20)
      )
    `);
    await q.query(`COMMENT ON TABLE user_password_credentials IS
      '이메일·비밀번호 로그인 수단 (WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1). 행 존재 = 수단 보유. 옛 service_credentials 의 부활이 아니다 — 서비스별 축이 아니라 계정 1행'`);
    await q.query(`COMMENT ON COLUMN user_password_credentials.password_hash IS
      '단방향 해시만 저장. 평문·복구 가능 형태 금지 (chk_upc_hash_len 이 하한을 강제)'`);

    // ── 2. 이메일 소유 확인 토큰 (가입 확인 · 주소 변경 확인 공용) ─────────
    //
    // ⚠️ 같은 이름의 테이블이 **이미 있다** — Google-only 정리 때 소비처만 없애고 테이블은 남은
    //    고아다. 격리 PostgreSQL 에서 `CREATE TABLE` 이 42P07 로 실패해 발견했다(가정이 아니라 실측).
    //    남아 있던 형태: `token character varying NOT NULL`(**평문**) · camelCase(`userId` ·
    //    `expiresAt` · `usedAt`). 이 WO 는 토큰을 해시로만 저장하므로 그 형태를 쓸 수 없다.
    //
    //    그래서 **DROP 후 새 형태로 CREATE** 한다. 근거:
    //      · 운영 실측 0행 (2026-09-29 read-only) → 데이터 손실 0
    //      · 런타임 소비처 0 (`google-only-auth-cleanup.spec.ts` 가 0을 가드하고 있다)
    //      · 같은 일을 하는 테이블을 둘로 만들지 않는다 — 한쪽이 뒤처지는 구조를 피한다
    //    평문 컬럼을 nullable 로 낮춰 남기는 선택도 가능하지만, 쓰지 않는 평문 토큰 컬럼을
    //    스키마에 남기는 것은 재유입 경로가 된다.
    await q.query(`DROP TABLE email_verification_tokens`);
    await q.query(`
      CREATE TABLE email_verification_tokens (
        id uuid DEFAULT uuid_generate_v4() NOT NULL,
        user_id uuid NOT NULL,
        email character varying(255) NOT NULL,
        token_hash character varying(255) NOT NULL,
        expires_at timestamp without time zone NOT NULL,
        consumed_at timestamp without time zone,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT pk_email_verification_tokens PRIMARY KEY (id),
        CONSTRAINT uq_evt_token_hash UNIQUE (token_hash),
        CONSTRAINT fk_evt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    await q.query(`CREATE INDEX idx_evt_user ON email_verification_tokens (user_id)`);
    await q.query(`COMMENT ON COLUMN email_verification_tokens.email IS
      '이 토큰이 확인하려는 주소. 식별자가 아니다 — 계정은 user_id 로 식별한다'`);
    await q.query(`COMMENT ON COLUMN email_verification_tokens.token_hash IS
      '평문 토큰은 메일 링크에만 존재한다. DB·로그에 남기지 않는다'`);

    // ── 3. 비밀번호 재설정 토큰 (이름만 옛것과 같고 형태가 다르다) ─────────
    await q.query(`
      CREATE TABLE password_reset_tokens (
        id uuid DEFAULT uuid_generate_v4() NOT NULL,
        user_id uuid NOT NULL,
        token_hash character varying(255) NOT NULL,
        expires_at timestamp without time zone NOT NULL,
        consumed_at timestamp without time zone,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT pk_password_reset_tokens PRIMARY KEY (id),
        CONSTRAINT uq_prt_token_hash UNIQUE (token_hash),
        CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    await q.query(`CREATE INDEX idx_prt_user ON password_reset_tokens (user_id)`);
    await q.query(`COMMENT ON TABLE password_reset_tokens IS
      '재설정 토큰 — 2026-09-24 DROP 된 동명 테이블과 이름만 같다. 평문 토큰을 저장하지 않고 consumed_at 으로 1회용을 물리 보장한다'`);
  }

  public async down(q: QueryRunner): Promise<void> {
    // 신규 생성 migration 이므로 되돌리기는 단순 제거다.
    // `IF EXISTS` 를 쓰지 않는다 — 대상이 없다는 것은 예상하지 못한 상태이므로 크게 실패해야 한다.
    await q.query(`DROP TABLE password_reset_tokens`);
    await q.query(`DROP TABLE email_verification_tokens`);
    await q.query(`DROP TABLE user_password_credentials`);

    // `email_verification_tokens` 는 이 migration 이 **지운 뒤 다시 만든** 테이블이므로,
    // 되돌릴 때 baseline 원형(평문 token · camelCase)을 복원한다. 0행이었으므로 데이터는 없다.
    await q.query(`
      CREATE TABLE email_verification_tokens (
        id uuid DEFAULT uuid_generate_v4() NOT NULL,
        token character varying NOT NULL,
        "userId" uuid NOT NULL,
        "expiresAt" timestamp without time zone NOT NULL,
        email character varying NOT NULL,
        "usedAt" timestamp without time zone,
        "createdAt" timestamp without time zone DEFAULT now() NOT NULL
      )
    `);
  }
}
