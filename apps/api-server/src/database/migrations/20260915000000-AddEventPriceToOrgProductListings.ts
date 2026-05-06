/**
 * WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1
 *
 * organization_product_listings 에 event_price 컬럼 추가.
 *
 * 의미:
 *   - event_price: 공급자가 지정한 이벤트 전용 공급가 (별도 필드)
 *   - 기존 price 컬럼은 supplier_product_offers.price_general 스냅샷 (변경 없음)
 *   - 일반 공급가/소비자가는 절대 수정하지 않는다 (정책)
 *
 * 배경:
 *   현재 createListing 은 spo.price_general 을 opl.price 로 단순 복사하고,
 *   이벤트 전용 가격 입력 경로가 없었다. 본 컬럼 추가로 supplier 가
 *   이벤트 가격을 별도 저장할 수 있게 한다. 기존 row 는 NULL.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEventPriceToOrgProductListings20260915000000 implements MigrationInterface {
  name = 'AddEventPriceToOrgProductListings20260915000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE organization_product_listings
        ADD COLUMN IF NOT EXISTS event_price NUMERIC(12, 2) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE organization_product_listings
        DROP COLUMN IF EXISTS event_price
    `);
  }
}
