import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-PRODUCT-CURATION-V1
 *
 * 큐레이션 테이블: 승인된 Offer 중 operator가 노출 선택
 */
export class CreateOfferCurationsTable1771200000018 implements MigrationInterface {
  name = 'CreateOfferCurationsTable1771200000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS offer_curations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        offer_id UUID NOT NULL REFERENCES supplier_product_offers(id) ON DELETE CASCADE,
        service_key VARCHAR(50) NOT NULL,
        placement VARCHAR(50) NOT NULL,
        category_id UUID NULL,
        position INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        start_at TIMESTAMP NULL,
        end_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_offer_curations_unique
      ON offer_curations (offer_id, service_key, placement, COALESCE(category_id, '00000000-0000-0000-0000-000000000000'))
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_offer_curations_active
      ON offer_curations (service_key, placement, is_active)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS offer_curations`);
  }
}
