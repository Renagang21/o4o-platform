import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Legacy password 인증 스키마 물리 제거 (Phase B-2)
 *
 * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1 §43 DESTRUCTIVE GATE — 사용자 승인 2026-09-24
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 지금인가 — contract-last 순서
 *
 *   Phase A(2026-09-24 배포)가 런타임에서 password 경로를 은퇴시켰고,
 *   Phase B-1(`03751-ctw` / `01310-cwm`, 같은 날 traffic 100%)이 **스키마 의존까지 0** 으로 만들었다:
 *     - `google-auth.service.ts` 가 `password` / `loginAttempts` / `lockedUntil` 을 더 이상 쓰지 않는다
 *     - `User` entity 가 해당 컬럼 5개를 선언하지 않는다
 *     - `ServiceCredential` · `PasswordResetToken` entity 와 DataSource 등록이 사라졌다
 *   그리고 B-1 revision 이 서빙되는 상태에서 **관리자 Google 로그인 회귀가 PASS** 했다
 *   (users.lastLoginAt / linked_accounts.lastUsedAt 전진 · identity·roles·memberships 불변).
 *
 *   즉 이 migration 이 지우는 객체를 읽거나 쓰는 런타임 코드는 이미 없다.
 *   deploy 순서상 migration 이 새 revision 보다 먼저 실행되므로, **코드 선행이 필수**였다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 삭제 대상과 그때의 실측 (production census 2026-09-24, read-only)
 *
 *   service_credentials        5행 / user 1명 / orphan 0 — 인증 경로에서 읽히지 않음
 *   password_reset_tokens      5행 (used 4 · unused 1 · **전부 expired**)
 *   users.password             non-null 0
 *   users.reset_password_token / reset_password_expires   non-null 0
 *   users."loginAttempts"      0 이외 값 0      users."lockedUntil"   non-null 0
 *
 *   의존 객체 점검: password 축을 참조하는 view 0 · 해당 컬럼 위 index 0 · users trigger 0.
 *   두 테이블의 FK 는 자식 쪽(→ users)이라 DROP TABLE 과 함께 사라진다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 남기는 것 (의도적 · 이번 범위 밖)
 *
 *   login_attempts 테이블      FROZEN `auth-core` manifest 가 소유 테이블로 선언한다(CLAUDE.md §3 · F10).
 *                              0행이지만 Core 변경 승인이 선행돼야 하므로 건드리지 않는다.
 *   users.email                optional 화는 이번 WO 에서 제외한다(사용자 지시).
 *   bcrypt / bcryptjs dep      frozen historical migration 4개 파일이 import 한다
 *                              (historical-migrations.manifest.json · 집합 축소는 baseline rollover 로만).
 *   sanitizer 블랙리스트       과거 필드명을 계속 차단한다 — 제거하면 재유입 시 무방비다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ ROLLBACK 한계 — `down()` 은 구조만 되돌린다
 *
 *   `down()` 은 테이블·컬럼을 원래 형태로 재생성하지만 **데이터는 돌아오지 않는다.**
 *   `service_credentials` 5행의 password hash 와 `password_reset_tokens` 5행은 영구 소실이다.
 *   그 의미: 비밀번호 로그인으로의 복귀 경로가 닫힌다. 되살리려면 각 사용자가 Google 로 로그인한 뒤
 *   비밀번호를 새로 설정해야 한다(승인 시점 계정은 1개이고 그 계정의 `password` 는 이미 NULL 이라
 *   실질 손실은 0이다). backup 시점으로의 PITR 은 다른 테이블까지 함께 되돌리므로
 *   이 변경만 선택적으로 복구하는 수단이 아니다.
 *
 *   `IF EXISTS` 를 쓰지 않는다 — 대상이 없다는 것은 **예상하지 못한 상태**이므로
 *   조용히 지나가지 말고 크게 실패해야 한다.
 */
export class DropLegacyPasswordAuthSchema1790251584623 implements MigrationInterface {
  name = 'DropLegacyPasswordAuthSchema1790251584623';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. password 전용 테이블 2개 ──────────────────────────────────────────
    // FK(→ users)는 테이블과 함께 사라진다. 단독 DELETE 는 하지 않는다(DROP 에 포함).
    await queryRunner.query(`DROP TABLE "service_credentials"`);
    await queryRunner.query(`DROP TABLE "password_reset_tokens"`);

    // ── 2. users 의 password · 재설정 · lockout 컬럼 ─────────────────────────
    // lockout 두 컬럼은 B-1 에서 마지막 writer(google-auth.service 의 로그인 시 reset)를
    // 제거했기 때문에 지금 드롭할 수 있다. 순서를 바꾸면 로그인이 깨진다.
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "reset_password_token"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "reset_password_expires"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "loginAttempts"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "lockedUntil"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 구조 복원 전용 — 데이터는 복원하지 않는다(위 ROLLBACK 한계 참조).
    // 컬럼 정의는 canonical baseline 2026-09-18-id685 의 원문과 같다.
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "lockedUntil" timestamp without time zone`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "loginAttempts" integer DEFAULT 0 NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "reset_password_expires" timestamp without time zone`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "reset_password_token" character varying(255)`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "password" character varying(255)`);

    await queryRunner.query(`
      CREATE TABLE "password_reset_tokens" (
        id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
        token character varying NOT NULL,
        "userId" uuid NOT NULL,
        "expiresAt" timestamp without time zone NOT NULL,
        email character varying NOT NULL,
        "usedAt" timestamp without time zone,
        "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
        service_key character varying(100)
      )
    `);
    await queryRunner.query(
      `ALTER TABLE ONLY "password_reset_tokens" ADD CONSTRAINT "PK_password_reset_tokens" PRIMARY KEY (id)`,
    );
    await queryRunner.query(
      `ALTER TABLE ONLY "password_reset_tokens" ADD CONSTRAINT "UQ_password_reset_tokens_token" UNIQUE (token)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_password_reset_tokens_userId_createdAt" ON "password_reset_tokens" USING btree ("userId", "createdAt")`,
    );
    await queryRunner.query(`
      ALTER TABLE ONLY "password_reset_tokens"
        ADD CONSTRAINT "FK_password_reset_tokens_user" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE TABLE "service_credentials" (
        id uuid DEFAULT gen_random_uuid() NOT NULL,
        user_id uuid NOT NULL,
        service_key character varying(100) NOT NULL,
        password_hash character varying(255) NOT NULL,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL
      )
    `);
    await queryRunner.query(
      `ALTER TABLE ONLY "service_credentials" ADD CONSTRAINT "PK_service_credentials" PRIMARY KEY (id)`,
    );
    await queryRunner.query(
      `ALTER TABLE ONLY "service_credentials" ADD CONSTRAINT uq_service_credentials_user_service UNIQUE (user_id, service_key)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_service_credentials_user ON "service_credentials" USING btree (user_id)`,
    );
    await queryRunner.query(`
      ALTER TABLE ONLY "service_credentials"
        ADD CONSTRAINT "FK_service_credentials_user" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
    `);
  }
}
