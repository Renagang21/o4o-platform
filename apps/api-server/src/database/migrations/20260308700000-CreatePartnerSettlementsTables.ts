import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PARTNER-COMMISSION-SETTLEMENT-V1
 *
 * partner_settlements — 파트너 커미션 정산 배치
 * partner_settlement_items — 정산 대상 커미션 연결
 *
 * Settlement Flow:
 *   approved commissions → settlement batch 생성 → 지급 처리 → paid
 *
 * Status:
 *   pending → processing → paid
 */
export class CreatePartnerSettlementsTables20260308700000 implements MigrationInterface {
  name = 'CreatePartnerSettlementsTables20260308700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // partner_settlements — 정산 배치
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS partner_settlements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        partner_id UUID NOT NULL,
        total_commission INT NOT NULL DEFAULT 0,
        commission_count INT NOT NULL DEFAULT 0,
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        paid_at TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_partner_settlements_partner_id
        ON partner_settlements (partner_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_partner_settlements_status
        ON partner_settlements (status)
    `);

    // partner_settlement_items — 정산-커미션 연결
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS partner_settlement_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        settlement_id UUID NOT NULL,
        commission_id UUID NOT NULL,
        commission_amount INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_partner_settlement_items_settlement_id
        ON partner_settlement_items (settlement_id)
    `);

    // 한 커미션은 하나의 정산에만 포함 (중복 방지)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_settlement_items_commission_unique
        ON partner_settlement_items (commission_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_partner_settlement_items_commission_unique`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_partner_settlement_items_settlement_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS partner_settlement_items`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_partner_settlements_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_partner_settlements_partner_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS partner_settlements`);
  }
}
