/**
 * WO-O4O-STORE-FLOW-BLOCKER-FIX-V1 — BUG-2
 *
 * organization_product_listings 에 Event Offer 컬럼 추가 (production 누락분).
 *
 * 1771200000026-EventOfferCoreReform.ts 가 src/migrations/ (구 레거시 디렉토리)에
 * 잘못 배치되어 production migration runner 에 포함되지 않았음.
 * IF NOT EXISTS 로 idempotent 하게 재적용.
 *
 * 추가 컬럼:
 *   - status         VARCHAR(20)  NOT NULL DEFAULT 'pending'
 *   - start_at       TIMESTAMP    NULL
 *   - end_at         TIMESTAMP    NULL
 *   - total_quantity INTEGER      NULL
 *   - per_store_limit INTEGER     NULL
 *   - per_order_limit INTEGER     NULL
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEventOfferColumnsToListings20260906100000 implements MigrationInterface {
  name = 'AddEventOfferColumnsToListings20260906100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE organization_product_listings
        ADD COLUMN IF NOT EXISTS status          VARCHAR(20)  NOT NULL DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS start_at        TIMESTAMP    NULL,
        ADD COLUMN IF NOT EXISTS end_at          TIMESTAMP    NULL,
        ADD COLUMN IF NOT EXISTS total_quantity  INTEGER      NULL,
        ADD COLUMN IF NOT EXISTS per_store_limit INTEGER      NULL,
        ADD COLUMN IF NOT EXISTS per_order_limit INTEGER      NULL
    `);

    // 기존 kpa-groupbuy 데이터 상태 이관 (중복 실행 안전)
    await queryRunner.query(`
      UPDATE organization_product_listings
      SET status = CASE
        WHEN is_active = true THEN 'approved'
        ELSE                       'pending'
      END
      WHERE service_key = 'kpa-groupbuy'
        AND status = 'pending'
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
