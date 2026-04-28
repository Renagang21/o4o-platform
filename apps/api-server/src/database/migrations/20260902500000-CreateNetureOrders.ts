import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * IR/WO-NETURE-ORDERS-MISSING-TABLE-MIGRATION-FIX-V1
 *
 * Production DB에 `neture_orders`, `neture_order_items` 및 `neture` schema 자체가
 * 존재하지 않아 후속 ALTER 마이그레이션
 * (`AddOrderTypeAndCustomerInfoToNetureOrders20260903000000`)이 실패함.
 *
 * 본 마이그레이션은 timestamp 20260902500000으로
 * (20260902000000-AddSupplierOrderCondition < 본 파일 < 20260903000000-AddOrderTypeAndCustomerInfo)
 * 위치하여 ALTER 이전에 누락 테이블을 생성한다.
 *
 * 작업:
 *   - CREATE SCHEMA IF NOT EXISTS neture
 *   - CREATE TABLE IF NOT EXISTS public.neture_orders (entity 정의 그대로, order_type/customer_info 포함)
 *   - CREATE TABLE IF NOT EXISTS neture.neture_order_items (entity 정의 그대로)
 *   - 엔티티의 @Index() 컬럼에 대해 CREATE INDEX IF NOT EXISTS
 *
 * 주의:
 *   - 모든 DDL은 IF NOT EXISTS — 후속 ALTER 마이그레이션의 IF NOT EXISTS와 멱등 결합
 *   - FK 제약(neture_order_items.product_id → neture.neture_products.id)은 추가하지 않음.
 *     `neture_products` 테이블이 prod에 부재하고 본 WO 범위 외이므로
 *     ORM 레벨 ManyToOne만 유지하고 DB 레벨 constraint는 별도 WO에서 처리.
 *   - public/neture schema 분리는 entity 정의의 schema 옵션을 그대로 따른다.
 */
export class CreateNetureOrders20260902500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. neture schema 생성 (neture_order_items가 사용)
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS neture`);

    // 2. public.neture_orders — neture-order.entity.ts 정의 기준
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.neture_orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number varchar(50) NOT NULL UNIQUE,
        user_id uuid NOT NULL,
        status varchar(30) NOT NULL DEFAULT 'created',
        total_amount int NOT NULL DEFAULT 0,
        discount_amount int NOT NULL DEFAULT 0,
        shipping_fee int NOT NULL DEFAULT 0,
        final_amount int NOT NULL DEFAULT 0,
        currency varchar(10) NOT NULL DEFAULT 'KRW',
        payment_method varchar(30),
        payment_key varchar(200),
        paid_at timestamptz,
        shipping jsonb,
        orderer_name varchar(100),
        orderer_phone varchar(30),
        orderer_email varchar(200),
        note text,
        order_type varchar(30) NOT NULL DEFAULT 'STORE_RESTOCK',
        customer_info jsonb,
        metadata jsonb,
        cancelled_at timestamptz,
        cancel_reason text,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // public.neture_orders 인덱스 — entity의 @Index() 표시 컬럼
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_neture_orders_order_number ON public.neture_orders(order_number)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_neture_orders_user_id ON public.neture_orders(user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_neture_orders_status ON public.neture_orders(status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_neture_orders_order_type ON public.neture_orders(order_type)`);

    // 3. neture.neture_order_items — neture-order-item.entity.ts 정의 기준
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS neture.neture_order_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id uuid NOT NULL,
        product_id uuid NOT NULL,
        product_name varchar(200) NOT NULL,
        product_image jsonb,
        quantity int NOT NULL DEFAULT 1,
        unit_price int NOT NULL DEFAULT 0,
        total_price int NOT NULL DEFAULT 0,
        options jsonb,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // neture.neture_order_items 인덱스 — entity의 @Index() 표시 컬럼
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_neture_order_items_order_id ON neture.neture_order_items(order_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_neture_order_items_product_id ON neture.neture_order_items(product_id)`);

    console.log('[Migration] Created neture schema + public.neture_orders + neture.neture_order_items (with indexes)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 후속 ALTER가 추가한 인덱스/컬럼 제거는 그쪽 down에서 처리.
    // 본 마이그레이션은 테이블 자체 제거.
    await queryRunner.query(`DROP TABLE IF EXISTS neture.neture_order_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.neture_orders`);
    // schema는 다른 entity가 사용할 가능성이 있으므로 DROP SCHEMA는 하지 않음
  }
}
