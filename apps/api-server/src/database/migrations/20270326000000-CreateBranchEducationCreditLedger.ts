/**
 * CreateBranchEducationCreditLedger
 * WO-O4O-KPA-BRANCH-CONTINUING-EDUCATION-CREDIT-LEDGER-V1
 *
 * 분회 연수교육 평점 원장 1테이블.
 *
 *   branch_education_credit_ledgers   분회 × 연도 × 회원 → 의무평점 / 인정평점 / 상태
 *
 * 만들지 않는 것 (WO §10): LMS · 강좌 · 수강신청 · 출결 · 자동 평점수집 ·
 * 대한약사회 연수교육 API 연동 · 교육비 결제 · 증빙파일 관리.
 * 평점 발생내역 테이블(`..._entries`)도 만들지 않았다 — 건별 내역은 대한약사회
 * 시스템이 갖고, 분회가 사본을 관리하면 원본과 어긋나는 두 번째 원장이 된다.
 *
 * 재사용 조사 결과 (WO §8, 프로덕션 실측 2026-09-08):
 *   - `CreditRecord`(lms-yaksa)  = 소스 삭제됨. `dist/` 잔존물이며 git 미추적 → 복원하지 않는다.
 *   - `credit_balances` / `credit_transactions` = balance·amount·transactionType
 *     → **포인트·정산성 크레딧**이고 연수교육과 무관하다.
 *   - `lms_certificates.credits` = 1행 · 값 0.00. course 결합이고 분회 축이 없다.
 *   - `lms_courses`(11) / `lms_enrollments`(11) = 일반 LMS. "회원 × 연도 × 인정평점" 축이 아니다.
 *   → 재사용 가능한 active 구조가 없어 신규 원장이 중복이 아니다. LMS 는 건드리지 않는다.
 *
 * status 를 **generated column** 으로 둔 이유 (WO §2):
 *   회비 원장(W5)은 status 를 저장하고 CHECK 로 정합을 강제했다. 여기서는 계산식만 둔다 —
 *   저장하지 않으면 애플리케이션 버그로도 어긋날 수 없다. 면제/유예만 입력값이고
 *   나머지 2상태는 (의무평점, 인정평점)에서 유일하게 결정된다.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBranchEducationCreditLedger20270326000000 implements MigrationInterface {
  name = 'CreateBranchEducationCreditLedger20270326000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "branch_education_credit_ledgers" (
        "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id"   uuid          NOT NULL,
        "user_id"           uuid          NOT NULL,
        "year"              int           NOT NULL,
        "required_credits"  numeric(4,1)  NOT NULL DEFAULT 0,
        "completed_credits" numeric(4,1)  NOT NULL DEFAULT 0,
        "exemption_type"    varchar(20),
        "status"            varchar(20)   NOT NULL
                            GENERATED ALWAYS AS (
                              CASE
                                WHEN "exemption_type" IS NOT NULL THEN 'exempt'
                                WHEN "completed_credits" >= "required_credits" THEN 'complete'
                                ELSE 'incomplete'
                              END
                            ) STORED,
        "memo"              text,
        "updated_by"        uuid,
        "created_at"        timestamptz   NOT NULL DEFAULT now(),
        "updated_at"        timestamptz   NOT NULL DEFAULT now()
      )
    `);

    // 평점은 음수가 될 수 없다
    await queryRunner.query(`
      ALTER TABLE "branch_education_credit_ledgers"
        DROP CONSTRAINT IF EXISTS "CHK_branch_edu_credits_amounts"
    `);
    await queryRunner.query(`
      ALTER TABLE "branch_education_credit_ledgers"
        ADD CONSTRAINT "CHK_branch_edu_credits_amounts"
        CHECK ("required_credits" >= 0 AND "completed_credits" >= 0)
    `);

    /**
     * 면제·유예 2종만 허용한다. ENUM 을 만들지 않는 이유는 W5 와 같다 —
     * 제도가 바뀔 때마다 migration 을 요구하면 정책 변경을 코드가 막는다.
     */
    await queryRunner.query(`
      ALTER TABLE "branch_education_credit_ledgers"
        DROP CONSTRAINT IF EXISTS "CHK_branch_edu_credits_exemption_type"
    `);
    await queryRunner.query(`
      ALTER TABLE "branch_education_credit_ledgers"
        ADD CONSTRAINT "CHK_branch_edu_credits_exemption_type"
        CHECK ("exemption_type" IS NULL OR "exemption_type" IN ('exempt', 'deferred'))
    `);

    /**
     * 이수 의무가 있는 행은 의무평점이 있어야 한다.
     * "의무평점 0" 을 미이수로 남겨두면 영원히 채울 수 없는 행이 된다 —
     * 이수할 것이 없으면 그것은 면제다 (회비 원장의 "부과액 0 = 면제" 와 같은 판단).
     */
    await queryRunner.query(`
      ALTER TABLE "branch_education_credit_ledgers"
        DROP CONSTRAINT IF EXISTS "CHK_branch_edu_credits_required"
    `);
    await queryRunner.query(`
      ALTER TABLE "branch_education_credit_ledgers"
        ADD CONSTRAINT "CHK_branch_edu_credits_required"
        CHECK ("exemption_type" IS NOT NULL OR "required_credits" > 0)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_branch_edu_credits_org_user_year"
        ON "branch_education_credit_ledgers" ("organization_id", "user_id", "year")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_branch_edu_credits_org_year"
        ON "branch_education_credit_ledgers" ("organization_id", "year")
    `);
    // 미이수 조회 — 운영자가 가장 자주 보는 목록
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_branch_edu_credits_incomplete"
        ON "branch_education_credit_ledgers" ("organization_id", "year")
        WHERE "status" = 'incomplete'
    `);
    // 회원 본인 조회 · 신상신고 연동 — (user_id, organization_id) 복합.
    // user_id 단독 인덱스를 만들지 않는다 (§7 Guard Rule 1 을 인덱스에서도 지킨다)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_branch_edu_credits_user_org"
        ON "branch_education_credit_ledgers" ("user_id", "organization_id")
    `);

    console.log('[CreateBranchEducationCreditLedger] branch_education_credit_ledgers ready');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "branch_education_credit_ledgers"`);
  }
}
