import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-NETURE-SUPPLIER-PRODUCT-SERVICE-SPECIFIC-PRICING-FLOW-V1 (옵션 C)
 *
 * 서비스별 공급가 SSOT — offer_id + service_key 단위 별도 가격.
 * price_general 은 기본/ fallback 으로 유지(불변). price_gold/platinum 은 계속 참고용.
 *
 * 주문 단가 우선순위: event_price > offer_service_prices.unit_price > price_general > legacy opl.price.
 * (offer_service_approvals 와 동일한 (offer_id, service_key) junction 패턴.)
 */
export class CreateOfferServicePrices20261117000000 implements MigrationInterface {
  name = 'CreateOfferServicePrices20261117000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS offer_service_prices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        offer_id UUID NOT NULL REFERENCES supplier_product_offers(id) ON DELETE CASCADE,
        service_key VARCHAR(50) NOT NULL,
        unit_price INT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (offer_id, service_key)
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_osp_offer ON offer_service_prices (offer_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_osp_service_key ON offer_service_prices (service_key)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS offer_service_prices`);
  }
}
