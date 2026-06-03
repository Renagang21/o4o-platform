import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Align checkout_orders schema with Frozen E-commerce Order Contract.
 *
 * WO-O4O-CHECKOUT-ORDERS-SCHEMA-CONTRACT-ALIGNMENT-V1
 *
 * 배경: 실제 checkout_orders 스키마가 계약 문서(E-COMMERCE-ORDER-CONTRACT §3/§7.1)와 drift.
 *   - order_type 컬럼 부재 (계약상 GENERIC/DROPSHIPPING/GLYCOPHARM/COSMETICS/TOURISM 분류 필요)
 *   - supplierId NOT NULL (retail 주문은 공급자 없음 → sentinel/임시매핑 없이 null 저장 필요)
 *
 * 본 마이그레이션은 신규 주문 원장을 만들지 않고, canonical checkout_orders 를 계약에 맞춰 복구한다.
 *
 * 멱등·비파괴:
 *   - order_type ADD COLUMN IF NOT EXISTS, DEFAULT 'GENERIC' → 기존 행 전부 GENERIC (데이터 손실 0)
 *   - supplierId DROP NOT NULL → 기존 행 supplierId 그대로 유지(non-null), 신규 retail 만 null 허용
 *   - 백필 없음. dropshipping/createOrder 회귀 없음(제약 완화 + 컬럼 추가만).
 */
export class AlignCheckoutOrdersSchemaContract20261102000000 implements MigrationInterface {
  name = 'AlignCheckoutOrdersSchemaContract20261102000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // checkout_orders 가 없으면(이론상) 안전하게 스킵 — 다른 환경 정합.
    const hasTable = await queryRunner.hasTable('checkout_orders');
    if (!hasTable) {
      return;
    }

    // 1) order_type enum 타입 (없으면 생성)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "checkout_orders_order_type_enum" AS ENUM
          ('GENERIC', 'DROPSHIPPING', 'GLYCOPHARM', 'COSMETICS', 'TOURISM');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // 2) order_type 컬럼 추가 (기존 행 default GENERIC)
    await queryRunner.query(`
      ALTER TABLE "checkout_orders"
        ADD COLUMN IF NOT EXISTS "order_type" "checkout_orders_order_type_enum" NOT NULL DEFAULT 'GENERIC'
    `);

    // 3) order_type 인덱스 (조회/집계 보조)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_checkout_orders_order_type" ON "checkout_orders" ("order_type")
    `);

    // 4) supplierId nullable 화 (retail 주문 수용 — sentinel 없이 null 저장)
    //    멱등: 이미 nullable 이면 no-op.
    await queryRunner.query(`
      ALTER TABLE "checkout_orders" ALTER COLUMN "supplierId" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('checkout_orders');
    if (!hasTable) {
      return;
    }

    // 역순. supplierId NOT NULL 복원은 null 행이 있으면 실패할 수 있음(retail 주문 존재 시) —
    // best-effort. 운영 down 은 일반 흐름이 아니므로 실패 시 수동 판단.
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_checkout_orders_order_type"`);
    await queryRunner.query(`ALTER TABLE "checkout_orders" DROP COLUMN IF EXISTS "order_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "checkout_orders_order_type_enum"`);
    await queryRunner.query(`ALTER TABLE "checkout_orders" ALTER COLUMN "supplierId" SET NOT NULL`);
  }
}
