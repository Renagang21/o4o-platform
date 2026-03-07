import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-INVENTORY-ENGINE-V1
 *
 * supplier_product_offers 테이블에 재고 관리 컬럼 추가
 *
 * - stock_quantity: 총 재고 수량
 * - reserved_quantity: 주문으로 예약된 수량 (아직 배송 전)
 * - low_stock_threshold: 재고 부족 경고 기준
 * - track_inventory: 재고 추적 활성화 여부 (false = 무한 재고)
 *
 * available_stock = stock_quantity - reserved_quantity
 */
export class AddInventoryToSupplierProductOffers20260307300000 implements MigrationInterface {
  name = 'AddInventoryToSupplierProductOffers20260307300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 재고 수량 (기본 0)
    await queryRunner.query(`
      ALTER TABLE supplier_product_offers
      ADD COLUMN IF NOT EXISTS stock_quantity INT NOT NULL DEFAULT 0
    `);

    // 예약 수량 (주문 생성 시 증가, 배송 완료/취소 시 감소)
    await queryRunner.query(`
      ALTER TABLE supplier_product_offers
      ADD COLUMN IF NOT EXISTS reserved_quantity INT NOT NULL DEFAULT 0
    `);

    // 재고 부족 경고 기준값
    await queryRunner.query(`
      ALTER TABLE supplier_product_offers
      ADD COLUMN IF NOT EXISTS low_stock_threshold INT NOT NULL DEFAULT 10
    `);

    // 재고 추적 활성화 여부 (false = 재고 무제한, 기존 상품 호환)
    await queryRunner.query(`
      ALTER TABLE supplier_product_offers
      ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE supplier_product_offers DROP COLUMN IF EXISTS track_inventory`);
    await queryRunner.query(`ALTER TABLE supplier_product_offers DROP COLUMN IF EXISTS low_stock_threshold`);
    await queryRunner.query(`ALTER TABLE supplier_product_offers DROP COLUMN IF EXISTS reserved_quantity`);
    await queryRunner.query(`ALTER TABLE supplier_product_offers DROP COLUMN IF EXISTS stock_quantity`);
  }
}
