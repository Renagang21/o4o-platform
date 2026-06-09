import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-CANONICAL-CART-CHECKOUT-FOUNDATION-V1 (additive)
 *
 * Canonical store cart foundation 테이블 store_cart_items 추가.
 * - 신규 테이블만 생성(IF NOT EXISTS) — 기존 테이블/데이터 무변경.
 * - boundary: buyer_id + service_key. 모든 상품 참조 컬럼 nullable.
 * - 기존 cart(KPA localStorage / Glyco·Neture)·주문·결제·정산 무영향.
 */
export class CreateStoreCartItems20260609000000 implements MigrationInterface {
  name = 'CreateStoreCartItems20260609000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "store_cart_items" (
        "id"                              uuid NOT NULL DEFAULT uuid_generate_v4(),
        "buyer_id"                        uuid NOT NULL,
        "organization_id"                 uuid,
        "service_key"                     varchar(50) NOT NULL,
        "source_type"                     varchar(30) NOT NULL DEFAULT 'regular',
        "supplier_id"                     varchar(100),
        "supplier_product_offer_id"       uuid,
        "organization_product_listing_id" uuid,
        "event_offer_id"                  uuid,
        "product_master_id"               uuid,
        "product_name"                    varchar(300) NOT NULL,
        "quantity"                        integer NOT NULL DEFAULT 1,
        "pricing_source"                  varchar(20) NOT NULL DEFAULT 'regular',
        "price_snapshot"                  integer NOT NULL DEFAULT 0,
        "created_at"                      timestamp NOT NULL DEFAULT now(),
        "updated_at"                      timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_store_cart_items" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_store_cart_items_buyer_service" ON "store_cart_items" ("buyer_id", "service_key")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_cart_items_buyer_service"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "store_cart_items"`);
  }
}
