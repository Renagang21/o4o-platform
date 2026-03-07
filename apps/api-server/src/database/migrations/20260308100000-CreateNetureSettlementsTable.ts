import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-SETTLEMENT-ENGINE-V1
 *
 * neture_settlements + neture_settlement_orders 테이블 생성
 *
 * - neture_settlements: 공급자별 정산 기간별 정산 결과
 * - neture_settlement_orders: 정산-주문 연결 (중복 정산 방지)
 * - status: pending → calculated → paid | cancelled
 * - platform_fee_rate: 정산 시점의 수수료율 스냅샷
 *
 * FK는 코드 레벨 참조만 (cross-schema 이슈 회피)
 */
export class CreateNetureSettlementsTable20260308100000 implements MigrationInterface {
  name = 'CreateNetureSettlementsTable20260308100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 정산 마스터 테이블
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS neture_settlements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        supplier_id UUID NOT NULL,

        period_start DATE NOT NULL,
        period_end DATE NOT NULL,

        total_sales INT NOT NULL DEFAULT 0,
        platform_fee INT NOT NULL DEFAULT 0,
        supplier_amount INT NOT NULL DEFAULT 0,
        platform_fee_rate NUMERIC(5,4) NOT NULL DEFAULT 0.10,

        order_count INT NOT NULL DEFAULT 0,

        status VARCHAR(30) NOT NULL DEFAULT 'pending',

        paid_at TIMESTAMPTZ,
        notes TEXT,

        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_neture_settlements_supplier_id
      ON neture_settlements (supplier_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_neture_settlements_status
      ON neture_settlements (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_neture_settlements_period
      ON neture_settlements (period_start, period_end)
    `);

    // 동일 공급자+기간 중복 방지 (취소 제외)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_neture_settlements_supplier_period
      ON neture_settlements (supplier_id, period_start, period_end)
      WHERE status != 'cancelled'
    `);

    // 정산-주문 연결 테이블
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS neture_settlement_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        settlement_id UUID NOT NULL,
        order_id UUID NOT NULL,
        supplier_sales_amount INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_neture_settlement_orders_settlement_id
      ON neture_settlement_orders (settlement_id)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_neture_settlement_orders_unique
      ON neture_settlement_orders (settlement_id, order_id)
    `);

    // 하나의 주문은 하나의 정산에만 포함 (중복 정산 방지)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_neture_settlement_orders_order_unique
      ON neture_settlement_orders (order_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS neture_settlement_orders`);
    await queryRunner.query(`DROP TABLE IF EXISTS neture_settlements`);
  }
}
