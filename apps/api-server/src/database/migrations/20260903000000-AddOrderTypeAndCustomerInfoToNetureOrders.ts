import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * IR-NETURE-B2B-DIRECT-SHIPPING-ORDER-FLOW-AUDIT-V1 — Phase 1 (데이터 모델 확장)
 *
 * Add order_type and customer_info to neture_orders to support
 * "매장 입고(STORE_RESTOCK) vs 고객 직배송(DIRECT_TO_CUSTOMER)" distinction.
 *
 * Changes:
 *   - order_type    varchar(30) NOT NULL DEFAULT 'STORE_RESTOCK'
 *                   기존 데이터 자동 백필 (DEFAULT가 모든 기존 row에 적용됨)
 *   - customer_info jsonb       NULLABLE
 *                   { name, phone, email?, consent_at } — DIRECT_TO_CUSTOMER 전용
 *   - idx_neture_orders_order_type 인덱스 (필터링 대비)
 *
 * 이 단계에서는 컬럼만 추가하고, 어떤 비즈니스 로직/UI도 변경하지 않는다.
 * Phase 2에서 createOrder 분기 도입, Phase 3에서 UI 적용.
 */
export class AddOrderTypeAndCustomerInfoToNetureOrders20260903000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // neture_orders 테이블은 public 스키마에 위치함 (schema: 'neture' 미적용)
    // IR/WO-NETURE-ORDERS-MISSING-TABLE-MIGRATION-FIX-V1: 선행 CreateNetureOrders20260902500000이
    // 테이블을 생성하므로 본 마이그레이션 도달 시점에는 테이블 존재. 추가 안전망으로
    // ALTER TABLE IF EXISTS를 사용해 부재 시에도 ROLLBACK 없이 NOTICE 후 SKIP되게 한다.
    await queryRunner.query(`
      ALTER TABLE IF EXISTS neture_orders
        ADD COLUMN IF NOT EXISTS order_type varchar(30) NOT NULL DEFAULT 'STORE_RESTOCK',
        ADD COLUMN IF NOT EXISTS customer_info jsonb
    `);

    // 방어적 백필 — DEFAULT가 적용되지만 NULL이 남은 경우 대비.
    // 테이블 부재 시 트랜잭션을 깨지 않도록 PL/pgSQL EXCEPTION으로 감싼다.
    await queryRunner.query(`
      DO $$ BEGIN
        UPDATE neture_orders SET order_type = 'STORE_RESTOCK' WHERE order_type IS NULL;
      EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END $$
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_neture_orders_order_type ON neture_orders(order_type)
    `);

    console.log('[Migration] neture_orders: added order_type, customer_info + idx_neture_orders_order_type');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_neture_orders_order_type`);
    await queryRunner.query(`
      ALTER TABLE IF EXISTS neture_orders
        DROP COLUMN IF EXISTS customer_info,
        DROP COLUMN IF EXISTS order_type
    `);
  }
}
