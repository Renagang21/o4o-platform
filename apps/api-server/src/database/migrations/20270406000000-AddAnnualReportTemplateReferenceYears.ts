import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-BRANCH-ANNUAL-REPORT-REFERENCE-YEARS-V1 §1 §2
 *
 * 신상신고의 **신고연도(year)** 와 **회비·연수교육 참조연도** 를 분리한다.
 *
 *   reportYear            = Y        (annual_report_templates.year — 그대로)
 *   feeReferenceYear      = Y        (reference_years.fee)
 *   trainingReferenceYear = Y − 1    (reference_years.training)
 *
 * 연도 규칙을 코드 상수로 두지 않고 양식 row 에 **실제 정수 연도**로 저장한다.
 * 제출 시점의 의미를 고정하고, 향후 규칙이 달라져도 과거 양식의 의미가 보존되게 하기 위함이다
 * (IR-O4O-KPA-BRANCH-PHARMACIST-MASTER-AND-REPORT-YEAR-SEMANTICS-V1 결정 ③).
 *
 * backfill: 기존 행 전부 `{fee: year, training: year - 1}`.
 *   - 2026 active: 제출본 0건. 종전 코드는 회비·연수교육 모두 신고연도(2026)로 원장을 읽었으나
 *     그것이 결함이므로 확정 규칙대로 {2026, 2025} 로 둔다.
 *   - 2027 draft: {2027, 2026}. 기존 승인본 1건의 스냅샷(values)은 건드리지 않는다.
 * backfill 후 NOT NULL — 읽기 경로가 "없으면 신고연도로 대체" 같은 코드 규칙을 갖지 않게 한다.
 */
export class AddAnnualReportTemplateReferenceYears20270406000000 implements MigrationInterface {
  name = 'AddAnnualReportTemplateReferenceYears20270406000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "annual_report_templates"
        ADD COLUMN IF NOT EXISTS "reference_years" jsonb NULL
    `);
    await queryRunner.query(`
      UPDATE "annual_report_templates"
         SET "reference_years" = jsonb_build_object('fee', "year", 'training', "year" - 1)
       WHERE "reference_years" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "annual_report_templates"
        ALTER COLUMN "reference_years" SET NOT NULL
    `);
    await queryRunner.query(
      `COMMENT ON COLUMN "annual_report_templates"."reference_years" IS '참조연도 {fee: 회비 기준년도, training: 연수교육 기준년도} — 실제 정수 연도. 제출본이 있으면 변경 금지'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "annual_report_templates"
        DROP COLUMN IF EXISTS "reference_years"
    `);
  }
}
