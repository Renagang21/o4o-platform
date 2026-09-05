/**
 * AddAnnualReportMembershipSync
 * WO-O4O-KPA-BRANCH-ANNUAL-REPORT-MEMBERSHIP-SYNC-V1
 *
 * 제출된 신상신고를 회원 원장(`kpa_members`)에 반영한 기록을 남긴다.
 *
 *   synced_to_membership  이 신고서가 원장에 반영됐는가 (재실행 멱등성의 기준)
 *   synced_changes        반영 기록 — 변경 전/후 값 + 건너뛴 항목 + 실행 주체·시각
 *
 * 컬럼을 2개만 추가한다. 실행 주체·시각은 별도 컬럼을 만들지 않고 `synced_changes`
 * 안에 담는다 (WO 가 명시한 스키마 그대로 유지).
 *
 * CHK_annual_reports_synced_submitted:
 *   **draft 는 절대 sync 될 수 없다**는 원칙을 애플리케이션이 아니라 DB 가 강제한다.
 *   코드 경로가 늘어나도 이 불변식은 깨지지 않는다.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnnualReportMembershipSync20270323000000 implements MigrationInterface {
  name = 'AddAnnualReportMembershipSync20270323000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "annual_reports"
        ADD COLUMN IF NOT EXISTS "synced_to_membership" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "annual_reports"
        ADD COLUMN IF NOT EXISTS "synced_changes" jsonb
    `);

    // draft 는 sync 될 수 없다 (원칙 1·2)
    await queryRunner.query(`
      ALTER TABLE "annual_reports"
        DROP CONSTRAINT IF EXISTS "CHK_annual_reports_synced_submitted"
    `);
    await queryRunner.query(`
      ALTER TABLE "annual_reports"
        ADD CONSTRAINT "CHK_annual_reports_synced_submitted"
        CHECK ("synced_to_membership" = false OR "status" = 'submitted')
    `);

    // 반영된 신고서는 반드시 기록을 남긴다 (기록 없는 반영 금지)
    await queryRunner.query(`
      ALTER TABLE "annual_reports"
        DROP CONSTRAINT IF EXISTS "CHK_annual_reports_synced_changes"
    `);
    await queryRunner.query(`
      ALTER TABLE "annual_reports"
        ADD CONSTRAINT "CHK_annual_reports_synced_changes"
        CHECK ("synced_to_membership" = false OR "synced_changes" IS NOT NULL)
    `);

    // 미반영 제출본 조회용 (운영자 작업 큐)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_annual_reports_sync_pending"
        ON "annual_reports" ("organization_id", "year")
        WHERE "status" = 'submitted' AND "synced_to_membership" = false
    `);

    console.log('[AddAnnualReportMembershipSync] annual_reports.synced_to_membership / synced_changes ready');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_annual_reports_sync_pending"`);
    await queryRunner.query(`
      ALTER TABLE "annual_reports" DROP CONSTRAINT IF EXISTS "CHK_annual_reports_synced_changes"
    `);
    await queryRunner.query(`
      ALTER TABLE "annual_reports" DROP CONSTRAINT IF EXISTS "CHK_annual_reports_synced_submitted"
    `);
    await queryRunner.query(`ALTER TABLE "annual_reports" DROP COLUMN IF EXISTS "synced_changes"`);
    await queryRunner.query(`ALTER TABLE "annual_reports" DROP COLUMN IF EXISTS "synced_to_membership"`);
  }
}
