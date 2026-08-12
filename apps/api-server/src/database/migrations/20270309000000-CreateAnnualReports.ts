/**
 * CreateAnnualReports
 * WO-O4O-KPA-BRANCH-ANNUAL-REPORT-SUBMISSION-V1 §1
 *
 * 회원별 연도 신상신고 제출 레코드.
 *
 *   UNIQUE(user_id, year)  — 한 해에 신고 1건
 *   FK template_id         — 제출 당시 양식 고정 (RESTRICT: 제출본이 있는 양식은 지울 수 없다)
 *   FK organization_id     — 제출 당시 분회
 *
 * 상태는 draft / submitted 2종. 검수 상태는 W4 에서 CHECK 제약을 확장한다.
 *
 * submitted_at 은 status='submitted' 일 때만 값이 있다 (CHK). 제출 시각을 클라이언트가
 * 정하지 못하도록 서버 시각으로만 채운다.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnnualReports20270309000000 implements MigrationInterface {
  name = 'CreateAnnualReports20270309000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "annual_reports" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "template_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "year" integer NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'draft',
        "values" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "submitted_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_annual_reports" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_annual_reports_user_year" UNIQUE ("user_id", "year"),
        CONSTRAINT "CHK_annual_reports_status"
          CHECK ("status" IN ('draft', 'submitted')),
        CONSTRAINT "CHK_annual_reports_submitted_at"
          CHECK (
            ("status" = 'draft' AND "submitted_at" IS NULL)
            OR ("status" = 'submitted' AND "submitted_at" IS NOT NULL)
          ),
        CONSTRAINT "CHK_annual_reports_year"
          CHECK ("year" BETWEEN 2000 AND 2100),
        CONSTRAINT "FK_annual_reports_template"
          FOREIGN KEY ("template_id") REFERENCES "annual_report_templates"("id")
          ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "FK_annual_reports_organization"
          FOREIGN KEY ("organization_id") REFERENCES "kpa_organizations"("id")
          ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    /** 분회 운영자의 연도별 목록 조회 축 (Primary Boundary = organizationId) */
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_annual_reports_org_year"
        ON "annual_reports" ("organization_id", "year", "status")
    `);

    console.log('[CreateAnnualReports] annual_reports ready');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_annual_reports_org_year"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "annual_reports"`);
  }
}
