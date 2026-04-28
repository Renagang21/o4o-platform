/**
 * WO-O4O-EVENT-OFFER-CORE-REFORM-V1
 *
 * organization_product_listings 에 Event Offer 구조 확장:
 *   - status: pending | approved | canceled (active/ended는 런타임 계산)
 *   - start_at / end_at: 이벤트 기간
 *   - total_quantity / per_store_limit / per_order_limit: 수량 제한
 *
 * 기존 데이터 마이그레이션:
 *   - service_key='kpa-groupbuy' & is_active=true  → status='approved'
 *   - service_key='kpa-groupbuy' & is_active=false → status='pending'
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EventOfferCoreReform1771200000026 implements MigrationInterface {
  name = 'EventOfferCoreReform1771200000026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE organization_product_listings
        ADD COLUMN IF NOT EXISTS status         VARCHAR(20)  NOT NULL DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS start_at       TIMESTAMP    NULL,
        ADD COLUMN IF NOT EXISTS end_at         TIMESTAMP    NULL,
        ADD COLUMN IF NOT EXISTS total_quantity  INTEGER      NULL,
        ADD COLUMN IF NOT EXISTS per_store_limit INTEGER      NULL,
        ADD COLUMN IF NOT EXISTS per_order_limit INTEGER      NULL
    `);

    // 기존 kpa-groupbuy 데이터 상태 이관
    await queryRunner.query(`
      UPDATE organization_product_listings
      SET status = CASE
        WHEN is_active = true  THEN 'approved'
        ELSE                        'pending'
      END
      WHERE service_key = 'kpa-groupbuy'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE organization_product_listings
        DROP COLUMN IF EXISTS status,
        DROP COLUMN IF EXISTS start_at,
        DROP COLUMN IF EXISTS end_at,
        DROP COLUMN IF EXISTS total_quantity,
        DROP COLUMN IF EXISTS per_store_limit,
        DROP COLUMN IF EXISTS per_order_limit
    `);
  }
}
