import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-INVENTORY-LEGACY-REMOVAL-V1
 *
 * store_products.stock_quantity 컬럼 제거.
 *
 * 배경:
 * O4O 내 매장 상품은 재고관리 대상이 아니라 주문 편의를 위한 취급 상품 목록이다.
 * 매장 단위 재고 수량은 정책상 미사용이며 혼란을 유발할 수 있어 제거한다.
 *
 * 유지 대상:
 * - supplier_product_offers.stock_quantity (공급자 중앙화 재고) — 수정 없음
 * - 주문/장바구니의 quantity 필드 — 수정 없음
 */
export class RemoveStoreProductStockQuantity20260904000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE store_products
      DROP COLUMN IF EXISTS stock_quantity
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE store_products
      ADD COLUMN IF NOT EXISTS stock_quantity integer
    `);
  }
}
