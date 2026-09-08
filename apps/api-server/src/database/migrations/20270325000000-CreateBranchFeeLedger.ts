/**
 * CreateBranchFeeLedger
 * WO-O4O-KPA-BRANCH-ANNUAL-FEE-LEDGER-V1
 *
 * 분회 연회비 원장 2테이블.
 *
 *   branch_fee_policies  분회 × 연도 × 회비구분 → 부과액
 *   branch_fee_ledgers   분회 × 연도 × 회원      → 부과액 / 납부액 / 상태
 *
 * 만들지 않는 것 (WO 원칙): 배분(전국·지부·분회) · PG 결제 · 송금 · 정산 · 납부 이력 테이블.
 * 돈이 이 시스템을 통과하지 않는다. 운영자가 납부 사실을 기록하는 원장일 뿐이다.
 *
 * 회비구분 코드는 새로 만들지 않고 `kpa_members.fee_category` 를 그대로 쓴다.
 * 두 테이블 모두 varchar(50) 이며 ENUM 을 만들지 않는다 — 회비 체계는 연도별로
 * 바뀔 수 있고, ENUM 은 그때마다 migration 을 요구해 정책 변경을 막는다.
 *
 * 정합성을 DB 가 강제하는 지점 (애플리케이션 버그가 원장을 오염시키지 못하게):
 *   CHK_branch_fee_ledgers_status  status 는 금액에서 파생된다. 'exempt' 만 예외 —
 *                                  면제는 운영자의 판정이며 금액으로 계산되지 않는다.
 *   CHK_branch_fee_ledgers_paid_at 납부액이 있으면 납부일이 있고, 없으면 없다.
 *   UNIQUE(organization_id, user_id, year)  한 분회에서 한 해에 한 행.
 *     전출해도 과거 행은 그 분회에 남는다 — 다른 분회가 덮어쓸 수 없다.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBranchFeeLedger20270325000000 implements MigrationInterface {
  name = 'CreateBranchFeeLedger20270325000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 연도별 회비 정책 ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "branch_fee_policies" (
        "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" uuid        NOT NULL,
        "year"            int         NOT NULL,
        "fee_category"    varchar(50) NOT NULL,
        "amount"          int         NOT NULL,
        "memo"            text,
        "created_at"      timestamptz NOT NULL DEFAULT now(),
        "updated_at"      timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "branch_fee_policies"
        DROP CONSTRAINT IF EXISTS "CHK_branch_fee_policies_amount"
    `);
    await queryRunner.query(`
      ALTER TABLE "branch_fee_policies"
        ADD CONSTRAINT "CHK_branch_fee_policies_amount" CHECK ("amount" >= 0)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_branch_fee_policies_org_year_category"
        ON "branch_fee_policies" ("organization_id", "year", "fee_category")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_branch_fee_policies_org_year"
        ON "branch_fee_policies" ("organization_id", "year")
    `);

    // ── 회원별 연도 회비 원장 ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "branch_fee_ledgers" (
        "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" uuid        NOT NULL,
        "user_id"         uuid        NOT NULL,
        "year"            int         NOT NULL,
        "fee_category"    varchar(50),
        "assessed_amount" int         NOT NULL DEFAULT 0,
        "paid_amount"     int         NOT NULL DEFAULT 0,
        "paid_at"         timestamptz,
        "status"          varchar(20) NOT NULL DEFAULT 'unpaid',
        "memo"            text,
        "updated_by"      uuid,
        "created_at"      timestamptz NOT NULL DEFAULT now(),
        "updated_at"      timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "branch_fee_ledgers"
        DROP CONSTRAINT IF EXISTS "CHK_branch_fee_ledgers_amounts"
    `);
    await queryRunner.query(`
      ALTER TABLE "branch_fee_ledgers"
        ADD CONSTRAINT "CHK_branch_fee_ledgers_amounts"
        CHECK ("assessed_amount" >= 0 AND "paid_amount" >= 0)
    `);

    /**
     * status ↔ 금액 정합.
     * 'exempt' 는 금액에서 파생되지 않는 유일한 상태이며 납부액이 있으면 모순이다.
     * 나머지 3종은 (assessed, paid) 로 유일하게 결정된다 — 애플리케이션이
     * 상태를 임의로 넣어도 DB 가 거부한다.
     */
    await queryRunner.query(`
      ALTER TABLE "branch_fee_ledgers"
        DROP CONSTRAINT IF EXISTS "CHK_branch_fee_ledgers_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "branch_fee_ledgers"
        ADD CONSTRAINT "CHK_branch_fee_ledgers_status"
        CHECK (
          ("status" = 'exempt'  AND "paid_amount" = 0)
          OR ("status" = 'unpaid'  AND "assessed_amount" > 0 AND "paid_amount" = 0)
          OR ("status" = 'partial' AND "assessed_amount" > 0
                                   AND "paid_amount" > 0
                                   AND "paid_amount" < "assessed_amount")
          OR ("status" = 'paid'    AND "assessed_amount" > 0
                                   AND "paid_amount" >= "assessed_amount")
        )
    `);

    await queryRunner.query(`
      ALTER TABLE "branch_fee_ledgers"
        DROP CONSTRAINT IF EXISTS "CHK_branch_fee_ledgers_paid_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "branch_fee_ledgers"
        ADD CONSTRAINT "CHK_branch_fee_ledgers_paid_at"
        CHECK (
          ("paid_amount" > 0 AND "paid_at" IS NOT NULL)
          OR ("paid_amount" = 0 AND "paid_at" IS NULL)
        )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_branch_fee_ledgers_org_user_year"
        ON "branch_fee_ledgers" ("organization_id", "user_id", "year")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_branch_fee_ledgers_org_year"
        ON "branch_fee_ledgers" ("organization_id", "year")
    `);
    // 미납 조회 — 운영자가 가장 자주 보는 목록
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_branch_fee_ledgers_outstanding"
        ON "branch_fee_ledgers" ("organization_id", "year")
        WHERE "status" IN ('unpaid', 'partial')
    `);
    // 회원 본인 조회 — (user_id, organization_id) 복합. user_id 단독 인덱스를 만들지 않는다
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_branch_fee_ledgers_user_org"
        ON "branch_fee_ledgers" ("user_id", "organization_id")
    `);

    console.log('[CreateBranchFeeLedger] branch_fee_policies / branch_fee_ledgers ready');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "branch_fee_ledgers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "branch_fee_policies"`);
  }
}
