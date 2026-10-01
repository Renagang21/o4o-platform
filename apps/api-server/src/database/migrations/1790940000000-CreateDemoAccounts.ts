import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Demo 계정 registry — `demo_accounts`
 *
 * WO-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1 Phase B-A
 * 정책 정본: `docs/baseline/O4O-CANONICAL-DEMO-ACCOUNTS-V1.md` (사용자 결정 2026-10-01)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 별도 테이블인가 — 네 후보 중 이것을 고른 이유
 *
 *   users.businessInfo   `json`(≠`jsonb`)이라 질의·인덱스에 불리하고, 플랫폼 운영 개념(Demo)을
 *                        사용자 **사업 정보**에 넣는 셈이 된다
 *   users.status         계정 생명주기 축(active/pending…)과 의미가 충돌한다
 *   users 신규 컬럼       identity SSOT 이자 Core Freeze 대상(`O4O-CORE-FREEZE-V1`)이다
 *   **별도 registry**     Demo 라는 **운영 목적**을 사용자 **정체성**과 분리한다 ← 채택
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 정본 키는 `user_id` 다 — 이메일이 아니다
 *
 *   `if (email === 'teststoreowner@gmail.com')` 같은 비교가 코드 곳곳에 퍼지는 것을 막는 것이
 *   이 테이블의 존재 이유다. 그래서 **email · password 를 여기 저장하지 않는다.**
 *   로그인은 기존 `users.email` + `user_password_credentials` 를 그대로 쓰고,
 *   Demo 판정은 `demo_accounts.user_id → users.id` 하나만 본다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 과설계하지 않는다
 *
 *   컬럼은 6개뿐이고 `demo_type` 은 지금 필요한 두 값으로 시작한다.
 *   INFLUENCER · PARTNER · OPERATOR_SANDBOX 는 그 기능이 실제로 설계될 때 CHECK 제약에 더한다
 *   (지금 넣어 두면 쓰지 않는 값이 정본인 척한다).
 *
 *   `UNIQUE(user_id)`    한 사용자는 한 종류의 Demo 다
 *   `UNIQUE(demo_type)`  **걸지 않는다** — 유형당 1개는 지금의 운영 방침이지 구조 제약이 아니다.
 *                        나중에 서비스별 Store Owner Demo 가 둘 필요해지면 제약부터 풀어야 한다.
 *                        대신 활성 유형이 하나임을 **부분 UNIQUE** 로 보장한다(아래).
 *
 * `demo_accounts` 는 **Demo 사용자**의 registry 다. **Demo 조직**은 별개 개념이며
 * (Demo Account → owner → Demo Organization → Sample Data), 조직 registry 가 실제로 필요한지는
 * relink/cleanup 요구를 보고 판단한다 — 이번 migration 은 만들지 않는다.
 */
export class CreateDemoAccounts1790940000000 implements MigrationInterface {
  name = 'CreateDemoAccounts1790940000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE demo_accounts (
        id uuid DEFAULT uuid_generate_v4() NOT NULL,
        user_id uuid NOT NULL,
        demo_type character varying(32) NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp without time zone NOT NULL DEFAULT now(),
        updated_at timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT pk_demo_accounts PRIMARY KEY (id),
        CONSTRAINT uq_demo_accounts_user UNIQUE (user_id),
        CONSTRAINT fk_demo_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT chk_demo_accounts_type CHECK (demo_type IN ('STORE_OWNER', 'SUPPLIER'))
      )
    `);

    // 활성 Demo 는 유형당 하나다. 비활성 기록은 남겨 둘 수 있게 **부분** UNIQUE 로 건다
    // (전체 UNIQUE 를 걸면 과거 Demo 를 is_active=false 로 보존할 수 없다).
    await q.query(
      `CREATE UNIQUE INDEX uq_demo_accounts_active_type ON demo_accounts (demo_type) WHERE is_active`,
    );

    await q.query(`COMMENT ON TABLE demo_accounts IS
      '공개 체험 Demo 계정 registry (WO-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1). Demo 판정의 정본 — 이메일 문자열 비교를 대신한다'`);
    await q.query(`COMMENT ON COLUMN demo_accounts.user_id IS
      'Demo 판정의 정본 키. email · password 는 이 표에 두지 않는다(users.email · user_password_credentials 사용)'`);
    await q.query(`COMMENT ON COLUMN demo_accounts.demo_type IS
      '지금은 STORE_OWNER · SUPPLIER 둘뿐. 새 유형은 그 기능이 설계될 때 CHECK 에 추가한다'`);
  }

  public async down(q: QueryRunner): Promise<void> {
    // `IF EXISTS` 를 쓰지 않는다 — 대상이 없다는 것은 예상하지 못한 상태다.
    await q.query(`DROP TABLE demo_accounts`);
  }
}
