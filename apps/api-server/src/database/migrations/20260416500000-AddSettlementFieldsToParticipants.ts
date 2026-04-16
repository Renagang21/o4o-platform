import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-MARKET-TRIAL-PHASE2-PARTICIPANT-DASHBOARD-AND-SETTLEMENT-STATE-V1
 *
 * market_trial_participants 테이블에 정산 필드 추가:
 * - "settlementChoice"       — 참여자 선택 (product/cash/null)
 * - "settlementStatus"       — 정산 상태 머신
 * - "settlementAmount"       — 정산 기준 금액
 * - "settlementProductQty"   — 예상/확정 제품 수량
 * - "settlementRemainder"    — 잔액 (Neture Credit 후보)
 * - "creditProcessStatus"    — Neture Credit 처리 상태
 * - "settlementNote"         — 운영자 메모
 * - "updatedAt"              — 갱신 타임스탬프
 */
export class AddSettlementFieldsToParticipants20260416500000 implements MigrationInterface {
  name = 'AddSettlementFieldsToParticipants20260416500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE market_trial_participants
        ADD COLUMN IF NOT EXISTS "settlementChoice"     VARCHAR(20)     DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "settlementStatus"     VARCHAR(30)     NOT NULL DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS "settlementAmount"     DECIMAL(12,2)   DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "settlementProductQty" INTEGER         DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "settlementRemainder"  DECIMAL(12,2)   DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "creditProcessStatus"  VARCHAR(20)     NOT NULL DEFAULT 'not_applicable',
        ADD COLUMN IF NOT EXISTS "settlementNote"       TEXT            DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "updatedAt"            TIMESTAMP       NOT NULL DEFAULT now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE market_trial_participants
        DROP COLUMN IF EXISTS "settlementChoice",
        DROP COLUMN IF EXISTS "settlementStatus",
        DROP COLUMN IF EXISTS "settlementAmount",
        DROP COLUMN IF EXISTS "settlementProductQty",
        DROP COLUMN IF EXISTS "settlementRemainder",
        DROP COLUMN IF EXISTS "creditProcessStatus",
        DROP COLUMN IF EXISTS "settlementNote",
        DROP COLUMN IF EXISTS "updatedAt"
    `);
  }
}
