import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PARTNER-COMMISSION-ENGINE-V1
 *
 * partner_commissions 테이블 생성
 *
 * 파트너 소개 판매에 대한 커미션 기록
 * - 커미션 연결: OrderItem → SupplierProductOffer → Recruitment → Contract → Partner
 * - commission_rate: 계약에서 스냅샷 (5.00 = 5%)
 * - 중복 방지: (partner_id, order_id) UNIQUE WHERE status != 'cancelled'
 */
export class CreatePartnerCommissionsTable20260308400000 implements MigrationInterface {
  name = 'CreatePartnerCommissionsTable20260308400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS partner_commissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        partner_id UUID NOT NULL,
        supplier_id UUID NOT NULL,
        order_id UUID NOT NULL,
        order_number VARCHAR(50),
        contract_id UUID NOT NULL,
        commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
        order_amount INT NOT NULL DEFAULT 0,
        commission_amount INT NOT NULL DEFAULT 0,
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        period_start DATE,
        period_end DATE,
        approved_at TIMESTAMPTZ,
        paid_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_partner_commissions_partner_id
        ON partner_commissions (partner_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_partner_commissions_status
        ON partner_commissions (status)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_partner_commissions_period
        ON partner_commissions (period_start, period_end)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_partner_commissions_order_id
        ON partner_commissions (order_id)
    `);

    // Unique: one commission per (partner_id, order_id), allow re-calc after cancellation
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_commissions_partner_order_unique
        ON partner_commissions (partner_id, order_id)
        WHERE status != 'cancelled'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_partner_commissions_partner_order_unique`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_partner_commissions_order_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_partner_commissions_period`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_partner_commissions_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_partner_commissions_partner_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS partner_commissions`);
  }
}
