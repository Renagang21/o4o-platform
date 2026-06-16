import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-SELLER-RECRUITMENT-EXPOSURE-BACKEND-V1 (IR-...-EXPOSURE-APPROVAL-MODEL-V1 dbd2ca435, B안)
 *
 * neture_partner_recruitments 에 서비스 노출 승인 상태(exposureStatus) + 감사 필드 추가.
 *  - RecruitmentStatus(recruiting/closed) = 모집 운영 상태 (불변)
 *  - exposure_status(pending/approved/rejected) = 서비스 노출 승인 상태 (신규)
 *
 * 정책:
 *  - 신규 모집: exposure_status = 'pending' (column DEFAULT)
 *  - 기존 모집: 동작 보존을 위해 'approved' backfill (이미 노출되던 모집을 갑자기 숨기지 않음)
 */
export class AddRecruitmentExposureStatus20260616100000
  implements MigrationInterface
{
  name = 'AddRecruitmentExposureStatus20260616100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) enum 타입 (RecruitmentStatus / ApplicationStatus 와 동일 native enum 패턴)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "neture_partner_recruitment_exposure_status_enum" AS ENUM ('pending', 'approved', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2) 컬럼 추가 (exposure_status 는 DEFAULT pending → 신규 row 자동 pending)
    await queryRunner.query(`
      ALTER TABLE "neture_partner_recruitments"
        ADD COLUMN IF NOT EXISTS "exposure_status" "neture_partner_recruitment_exposure_status_enum" NOT NULL DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS "exposure_reviewed_at" TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS "exposure_reviewed_by" UUID NULL,
        ADD COLUMN IF NOT EXISTS "exposure_review_note" TEXT NULL;
    `);

    // 3) 기존 모집 backfill — 본 migration 시점의 모든 기존 row 는 노출되던 모집이므로 approved.
    //    (migration 은 단일 트랜잭션 — 사이에 신규 insert 없음.)
    await queryRunner.query(`
      UPDATE "neture_partner_recruitments"
      SET "exposure_status" = 'approved'
      WHERE "exposure_status" = 'pending';
    `);

    // 4) 노출 승인 상태 조회 인덱스 (browse 필터 / operator 큐)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_neture_partner_recruitments_exposure_status"
        ON "neture_partner_recruitments" ("exposure_status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_neture_partner_recruitments_exposure_status"`);
    await queryRunner.query(`
      ALTER TABLE "neture_partner_recruitments"
        DROP COLUMN IF EXISTS "exposure_review_note",
        DROP COLUMN IF EXISTS "exposure_reviewed_by",
        DROP COLUMN IF EXISTS "exposure_reviewed_at",
        DROP COLUMN IF EXISTS "exposure_status";
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "neture_partner_recruitment_exposure_status_enum"`);
  }
}
