import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Local Work Agent V0 — 최소 스키마 (§35)
 *
 * 저장소 census 결과 재사용할 수 있는 device / device-session 테이블이 없었다.
 * `store_tablets` 는 스스로 "현재 device pairing 부재로 매장 단위 설정으로 운영" 이라고
 * 적어 두고 있다 — 즉 pairing 을 흉내 낼 기존 축조차 없다. 그래서 새로 만든다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 테이블들이 **저장하지 않는 것** (§36)
 *
 *   local file content · 환자정보 · 처방전 · screenshot · environment variables ·
 *   raw command output · user password · OS credential
 *
 * 저장하는 것은 **신원과 연결 상태**뿐이다. 유일한 payload 컬럼인 `result_data` 는
 * 화이트리스트(§21)를 통과한 OS 이름·버전·아키텍처만 담고, 서버가 그 값을 읽는 즉시
 * NULL 로 지워진다(§37) — 왕복 중에만 존재하는 임시 칸이다.
 *
 * 비밀값은 전부 SHA-256 해시로만 들어온다. 평문 pairing code · agent credential ·
 * session token 은 **어느 컬럼에도 없다**.
 */
export class CreateLocalAgentTables20270402000000 implements MigrationInterface {
  name = 'CreateLocalAgentTables20270402000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. 연결된 PC ─────────────────────────────────────────────────────────
    // id 는 서버가 만드는 random UUID 다. MAC · 시리얼 등 hardware fingerprint 에서
    // 파생하지 않는다 (§10).
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "local_agent_devices" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "device_name" varchar(80),
        "platform" varchar(20) NOT NULL,
        "agent_version" varchar(40) NOT NULL,
        "credential_hash" varchar(64) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "last_seen_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "revoked_at" timestamptz
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_local_agent_devices_user"
        ON "local_agent_devices" ("user_id", "status")
    `);

    // ── 2. pairing code ──────────────────────────────────────────────────────
    // 단명 · 1회용. consumed_at 이 1회용을 보장하는 유일한 장치다(조건부 UPDATE).
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "local_agent_pairings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "code_hash" varchar(64) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "consumed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    // 해시로 조회하므로 UNIQUE 로 둔다 — 충돌 시 조용히 남의 코드를 소모하는 일을 막는다.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_local_agent_pairings_code"
        ON "local_agent_pairings" ("code_hash")
    `);

    // ── 3. agent session ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "local_agent_sessions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "device_id" uuid NOT NULL,
        "token_hash" varchar(64) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "ended_at" timestamptz
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_local_agent_sessions_token"
        ON "local_agent_sessions" ("token_hash")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_local_agent_sessions_device"
        ON "local_agent_sessions" ("device_id")
    `);

    // ── 4. 명령 큐 겸 감사 기록 (§37·§38) ────────────────────────────────────
    // args 컬럼이 **없다.** V0 의 두 action 은 인자를 받지 않고, 인자를 담을 칸이 없으면
    // 나중에 인자를 몰래 실어 보낼 수도 없다.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "local_agent_commands" (
        "command_id" uuid PRIMARY KEY,
        "device_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "tool_name" varchar(60) NOT NULL,
        "action" varchar(60) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "error_code" varchar(60),
        "result_data" jsonb,
        "issued_at" timestamptz NOT NULL DEFAULT now(),
        "expires_at" timestamptz NOT NULL,
        "delivered_at" timestamptz,
        "completed_at" timestamptz
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_local_agent_commands_queue"
        ON "local_agent_commands" ("device_id", "status", "issued_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "local_agent_commands"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "local_agent_sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "local_agent_pairings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "local_agent_devices"`);
  }
}
