/**
 * AddBranchFeeExemptionReason
 * WO-O4O-KPA-BRANCH-FEE-EXEMPTION-REASON-LEDGER-V1
 *
 * 회비 원장의 `status='exempt'` 는 "면제됨"만 말하고 **왜 면제인지**를 담지 못했다.
 * 별도 면제 시스템을 만들지 않고 기존 `branch_fee_ledgers`(W5)에 2컬럼만 더한다.
 *
 *   exemption_type    면제 사유 구분
 *   exemption_reason  자유 사유 — `other` 일 때만
 *
 * 코드는 **신상신고 2026 양식이 이미 쓰는 값을 그대로 따른다** (WO §2 "기존 양식에 더
 * 정확한 코드가 있으면 그것을 우선한다"):
 *
 *   unemployed  미취업자      (양식 fee.exemptionType option)
 *   exempted    회비면제자    (양식 fee.exemptionType option)
 *   other       기타          — 양식에 없는 분회 실무 사유. 자유 사유 필수
 *
 * `other` 를 양식 밖에서 더한 이유는 분회 실무에 위 2종으로 담기지 않는 면제가 있기
 * 때문이다. 다만 양식에 option 이 없으므로 신상신고 resolve 는 `other` 를 표시하지 않고
 * 미연결로 둔다 (가짜 값 금지 — AnnualReportService 참조).
 *
 * `exempted_at` 은 만들지 않았다 (WO §2 "필요성 판단"): 이 행을 마지막으로 바꾼
 * 주체·시각은 `updated_by` / `updated_at` 이 이미 갖고 있고, 면제 시각만 따로 필요한
 * 소비처가 없다. 감사 테이블도 만들지 않는다 (WO §3).
 *
 * 착수 시점 프로덕션 `branch_fee_ledgers` **0행**이라 기존 데이터와 충돌하지 않는다.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBranchFeeExemptionReason20270328000000 implements MigrationInterface {
  name = 'AddBranchFeeExemptionReason20270328000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "branch_fee_ledgers"
        ADD COLUMN IF NOT EXISTS "exemption_type" varchar(20),
        ADD COLUMN IF NOT EXISTS "exemption_reason" text
    `);

    // ── 허용 코드 ────────────────────────────────────────────────────────────
    // ENUM 을 만들지 않는다 (W5·W6 와 같은 판단) — 제도가 바뀔 때마다 migration 을
    // 요구하면 정책 변경을 코드가 막는다.
    await queryRunner.query(`
      ALTER TABLE "branch_fee_ledgers"
        DROP CONSTRAINT IF EXISTS "CHK_branch_fee_ledgers_exemption_type"
    `);
    await queryRunner.query(`
      ALTER TABLE "branch_fee_ledgers"
        ADD CONSTRAINT "CHK_branch_fee_ledgers_exemption_type"
        CHECK ("exemption_type" IS NULL
               OR "exemption_type" IN ('unemployed', 'exempted', 'other'))
    `);

    /**
     * status ↔ 면제사유 정합 (WO §3).
     *
     *   status = 'exempt'  → exemption_type 필수
     *   status ≠ 'exempt'  → exemption_type · exemption_reason 모두 비어 있어야 한다
     *
     * 뒤쪽 절이 중요하다. 면제를 해제(paid/unpaid 로 전환)했는데 사유가 남아 있으면
     * "완납인데 미취업 면제" 같은 행이 원장에 남는다. DB 가 그것을 거부한다.
     */
    await queryRunner.query(`
      ALTER TABLE "branch_fee_ledgers"
        DROP CONSTRAINT IF EXISTS "CHK_branch_fee_ledgers_exemption_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "branch_fee_ledgers"
        ADD CONSTRAINT "CHK_branch_fee_ledgers_exemption_status"
        CHECK (
          ("status" = 'exempt' AND "exemption_type" IS NOT NULL)
          OR ("status" <> 'exempt' AND "exemption_type" IS NULL AND "exemption_reason" IS NULL)
        )
    `);

    /**
     * 자유 사유는 `other` 일 때만 (WO §2).
     * 그리고 `other` 는 사유 없이 쓸 수 없다 — 사유 없는 "기타"는 아무것도 기록하지 않은 것과 같다.
     * 공백만 넣어 우회하는 것도 막는다.
     */
    await queryRunner.query(`
      ALTER TABLE "branch_fee_ledgers"
        DROP CONSTRAINT IF EXISTS "CHK_branch_fee_ledgers_exemption_reason"
    `);
    await queryRunner.query(`
      ALTER TABLE "branch_fee_ledgers"
        ADD CONSTRAINT "CHK_branch_fee_ledgers_exemption_reason"
        CHECK (
          ("exemption_type" = 'other' AND "exemption_reason" IS NOT NULL
             AND btrim("exemption_reason") <> '')
          OR ("exemption_type" IS DISTINCT FROM 'other' AND "exemption_reason" IS NULL)
        )
    `);

    // 면제 현황 조회 — 운영자가 사유별로 세는 경로
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_branch_fee_ledgers_exemption"
        ON "branch_fee_ledgers" ("organization_id", "year", "exemption_type")
        WHERE "status" = 'exempt'
    `);

    console.log('[AddBranchFeeExemptionReason] branch_fee_ledgers exemption columns/constraints ready');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_branch_fee_ledgers_exemption"`);
    await queryRunner.query(`
      ALTER TABLE "branch_fee_ledgers"
        DROP CONSTRAINT IF EXISTS "CHK_branch_fee_ledgers_exemption_reason"
    `);
    await queryRunner.query(`
      ALTER TABLE "branch_fee_ledgers"
        DROP CONSTRAINT IF EXISTS "CHK_branch_fee_ledgers_exemption_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "branch_fee_ledgers"
        DROP CONSTRAINT IF EXISTS "CHK_branch_fee_ledgers_exemption_type"
    `);
    await queryRunner.query(`
      ALTER TABLE "branch_fee_ledgers"
        DROP COLUMN IF EXISTS "exemption_reason",
        DROP COLUMN IF EXISTS "exemption_type"
    `);
  }
}
