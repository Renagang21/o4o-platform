import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-IDENTITY-V2-PHASE1-SCHEMA-RESET-V1
 *
 * Identity V2 Canonical 의 L2 Credential Layer 토대 — service_credentials 테이블 신설.
 *
 * 본 마이그레이션은 destructive 변경이 없다 (신규 CREATE TABLE 만).
 *   - users / service_memberships / role_assignments 등 기존 테이블 ALTER 없음
 *   - 기존 데이터 backfill 없음 (G-B: No Backfill 정책 채택)
 *
 * 후속 WO (Register/Login dual-write/dual-read) 에서 본 테이블을 사용한다.
 * Phase 1 동안은 users.password fallback 으로 기존 사용자 인증 정상 작동.
 *
 * Adoption: DECISION-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-V1 (2026-05-23)
 * Canonical: O4O-IDENTITY-ARCHITECTURE-V2.md §3 (4-Layer Model — L2 Credential)
 */
export class CreateServiceCredentials20260523000000 implements MigrationInterface {
  name = 'CreateServiceCredentials20260523000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_credentials" (
        "id"            UUID         NOT NULL DEFAULT gen_random_uuid(),
        "user_id"       UUID         NOT NULL,
        "service_key"   VARCHAR(100) NOT NULL,
        "password_hash" VARCHAR(255) NOT NULL,
        "created_at"    TIMESTAMP    NOT NULL DEFAULT NOW(),
        "updated_at"    TIMESTAMP    NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_service_credentials" PRIMARY KEY ("id"),
        CONSTRAINT "uq_service_credentials_user_service" UNIQUE ("user_id", "service_key"),
        CONSTRAINT "FK_service_credentials_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_service_credentials_user"
        ON "service_credentials" ("user_id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "service_credentials"`);
  }
}
