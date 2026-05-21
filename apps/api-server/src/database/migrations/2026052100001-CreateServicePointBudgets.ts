import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-SERVICE-OPERATOR-POINT-BUDGET-PHASE1-V1
 *
 * 서비스별 포인트 예산 테이블 생성.
 *   service_point_budgets        — 서비스별 예산 현황 (allocated / used)
 *   service_point_budget_transactions — 예산 변경 이력 (입금/차감)
 *
 * 기존 credit_balances / credit_transactions 는 변경하지 않는다.
 */
export class CreateServicePointBudgets2026052100001 implements MigrationInterface {
  name = 'CreateServicePointBudgets2026052100001';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── service_point_budgets ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_point_budgets" (
        "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
        "service_key"      VARCHAR(100) NOT NULL,
        "allocated_amount" INTEGER NOT NULL DEFAULT 0,
        "used_amount"      INTEGER NOT NULL DEFAULT 0,
        "memo"             VARCHAR(500),
        "created_by"       UUID,
        "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_service_point_budgets" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_service_point_budgets_service_key" UNIQUE ("service_key"),
        CONSTRAINT "CHK_service_point_budgets_allocated" CHECK ("allocated_amount" >= 0),
        CONSTRAINT "CHK_service_point_budgets_used" CHECK ("used_amount" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_service_point_budgets_service_key"
        ON "service_point_budgets" ("service_key")
    `);

    // ── service_point_budget_transactions ────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_point_budget_transactions" (
        "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
        "service_key"   VARCHAR(100) NOT NULL,
        "amount"        INTEGER NOT NULL,
        "tx_type"       VARCHAR(20) NOT NULL,
        "reference_key" VARCHAR(255),
        "description"   VARCHAR(500),
        "operator_id"   UUID,
        "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_service_point_budget_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_spbt_tx_type" CHECK ("tx_type" IN ('allocate','deduct')),
        CONSTRAINT "UQ_spbt_reference_key" UNIQUE ("reference_key")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_spbt_service_key"
        ON "service_point_budget_transactions" ("service_key")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_spbt_created_at"
        ON "service_point_budget_transactions" ("created_at")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "service_point_budget_transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "service_point_budgets"`);
  }
}
