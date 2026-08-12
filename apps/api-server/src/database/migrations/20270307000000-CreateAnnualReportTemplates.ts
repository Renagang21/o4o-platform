/**
 * CreateAnnualReportTemplates
 * WO-O4O-KPA-BRANCH-ANNUAL-REPORT-TEMPLATE-SCHEMA-V1
 *
 * 연도별 약사 회원 신상신고 양식 테이블 1종.
 *
 *   annual_report_templates — (service_key, year, version) 단위 양식. 필드는 schema jsonb.
 *
 * 왜 필드를 컬럼으로 펴지 않는가:
 *   대한약사회 양식은 매년 바뀐다(2021→2026 사이에만 제3자 제공 동의·신고년도·최종학위·
 *   주소 3단이 신설됐다). 필드를 컬럼이나 코드 enum 으로 고정하면 양식 변경이 곧
 *   migration + 배포가 된다. 따라서 양식은 데이터로 두고 연도별 row 만 추가한다.
 *
 * 왜 organization_id 가 없는가:
 *   양식은 **서비스 전체 공통**이다. 분회마다 다른 신고서를 쓰지 않는다.
 *   따라서 tenant 컬럼을 두지 않는다 — 분회 경계는 제출 레코드(annual_reports, 후속 WO)에서
 *   적용된다. 여기에 organization_id 를 두면 209개 분회에 동일 양식이 복제되어
 *   양식 정정 시 209행을 고쳐야 한다.
 *
 * 제약 2종:
 *   1) UNIQUE (service_key, year, version)          — 같은 연도의 개정 차수 중복 금지
 *   2) 부분 UNIQUE (service_key, year) WHERE active — 연도당 활성 양식 최대 1개
 *
 * 데이터 seed 는 분리한다 → 20270308000000-SeedKpaBranchAnnualReportTemplate2026
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnnualReportTemplates20270307000000 implements MigrationInterface {
  name = 'CreateAnnualReportTemplates20270307000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "annual_report_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "service_key" varchar(50) NOT NULL,
        "year" integer NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "title" varchar(200) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'draft',
        "period_start" date,
        "period_end" date,
        "schema" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_annual_report_templates" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_annual_report_templates_service_year_version"
          UNIQUE ("service_key", "year", "version"),
        CONSTRAINT "CHK_annual_report_templates_status"
          CHECK ("status" IN ('draft', 'active', 'archived')),
        CONSTRAINT "CHK_annual_report_templates_year"
          CHECK ("year" BETWEEN 2000 AND 2100),
        CONSTRAINT "CHK_annual_report_templates_version"
          CHECK ("version" >= 1),
        CONSTRAINT "CHK_annual_report_templates_period"
          CHECK (
            "period_start" IS NULL OR "period_end" IS NULL
            OR "period_start" <= "period_end"
          )
      )
    `);

    /**
     * 연도당 활성 양식 1개.
     * 부분 UNIQUE 이므로 draft / archived 는 몇 건이든 누적된다
     * → 개정본을 draft 로 만들어 두고 교체 시점에 status 만 전환한다.
     */
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_annual_report_templates_active"
        ON "annual_report_templates" ("service_key", "year") WHERE "status" = 'active'
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_annual_report_templates_service_year"
        ON "annual_report_templates" ("service_key", "year" DESC)
    `);

    console.log('[CreateAnnualReportTemplates] annual_report_templates ready');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_annual_report_templates_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_annual_report_templates_service_year"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "annual_report_templates"`);
  }
}
