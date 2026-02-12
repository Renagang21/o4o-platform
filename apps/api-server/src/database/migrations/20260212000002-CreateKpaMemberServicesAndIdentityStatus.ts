import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-SERVICE-APPROVAL-ARCHITECTURE-V1
 *
 * 1. kpa_member_services 테이블 생성 (서비스별 승인 상태)
 * 2. kpa_members.identity_status 컬럼 추가 (신원 상태: active/suspended/withdrawn)
 * 3. 기존 status 데이터 → identity_status + kpa_member_services 이관
 *
 * identity_status 매핑:
 *   pending  → active (가입 신청은 했으니 신원 자체는 active)
 *   active   → active
 *   suspended → suspended
 *   withdrawn → withdrawn
 *
 * service 레코드 매핑 (service_key = 'kpa-a'):
 *   pending   → pending
 *   active    → approved
 *   suspended → suspended
 *   withdrawn → (레코드 생성하지 않음 — 탈퇴 회원)
 */
export class CreateKpaMemberServicesAndIdentityStatus1707696002000 implements MigrationInterface {
  name = 'CreateKpaMemberServicesAndIdentityStatus1707696002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. kpa_member_services 테이블 생성
    await queryRunner.query(`
      CREATE TABLE "kpa_member_services" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "member_id" uuid NOT NULL,
        "service_key" varchar(50) NOT NULL,
        "status" varchar(50) NOT NULL DEFAULT 'pending',
        "approved_by" uuid,
        "approved_at" timestamp,
        "rejection_reason" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_kpa_member_services" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_kpa_member_services_member_service" UNIQUE ("member_id", "service_key"),
        CONSTRAINT "FK_kpa_member_services_member" FOREIGN KEY ("member_id")
          REFERENCES "kpa_members"("id") ON DELETE CASCADE
      )
    `);
    console.log('[Migration] Created kpa_member_services table');

    // 2. kpa_members.identity_status 컬럼 추가
    await queryRunner.query(`
      ALTER TABLE "kpa_members"
      ADD COLUMN "identity_status" varchar(50) NOT NULL DEFAULT 'active'
    `);
    console.log('[Migration] Added identity_status column to kpa_members');

    // 3. 기존 status → identity_status 매핑
    await queryRunner.query(`
      UPDATE "kpa_members"
      SET "identity_status" = CASE
        WHEN "status" = 'suspended' THEN 'suspended'
        WHEN "status" = 'withdrawn' THEN 'withdrawn'
        ELSE 'active'
      END
    `);
    console.log('[Migration] Migrated status → identity_status');

    // 4. 기존 회원 → kpa_member_services 레코드 생성 (withdrawn 제외)
    const inserted = await queryRunner.query(`
      INSERT INTO "kpa_member_services" ("member_id", "service_key", "status", "created_at", "updated_at")
      SELECT
        "id",
        'kpa-a',
        CASE
          WHEN "status" = 'pending' THEN 'pending'
          WHEN "status" = 'active' THEN 'approved'
          WHEN "status" = 'suspended' THEN 'suspended'
        END,
        "created_at",
        now()
      FROM "kpa_members"
      WHERE "status" != 'withdrawn'
    `);
    console.log(`[Migration] Created ${Array.isArray(inserted) ? inserted.length : inserted} service records for existing members`);

    // 5. 인덱스 추가
    await queryRunner.query(`
      CREATE INDEX "IDX_kpa_member_services_member_id" ON "kpa_member_services" ("member_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_kpa_member_services_service_key_status" ON "kpa_member_services" ("service_key", "status")
    `);
    console.log('[Migration] Created indexes on kpa_member_services');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 인덱스 삭제
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_kpa_member_services_service_key_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_kpa_member_services_member_id"`);

    // identity_status 컬럼 삭제
    await queryRunner.query(`
      ALTER TABLE "kpa_members"
      DROP COLUMN IF EXISTS "identity_status"
    `);

    // kpa_member_services 테이블 삭제
    await queryRunner.query(`DROP TABLE IF EXISTS "kpa_member_services"`);
  }
}
