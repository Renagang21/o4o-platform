import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-STORE-MY-PRODUCTS-FLOW-SIMPLIFY-V1
 *
 * organization_product_listings.offer_id를 nullable로 변경하고
 * ProductMaster 기반 등록을 위한 고유 인덱스를 추가한다.
 *
 * 변경 사항:
 *   1. offer_id NOT NULL → NULL 허용
 *      - 기존 offer 기반 상품: offer_id = UUID (변경 없음)
 *      - 신규 master 기반 상품: offer_id = NULL
 *
 *   2. 부분 고유 인덱스 추가 (offer_id IS NULL인 경우만)
 *      idx_org_listing_unique_master ON (organization_id, service_key, master_id) WHERE offer_id IS NULL
 *      - offer 기반 고유 인덱스 idx_org_listing_unique_v2는 유지
 *      - PostgreSQL NULL 특성상 NULL끼리는 기존 인덱스에서 충돌하지 않으므로
 *        master 기반 상품의 멱등성 보장을 위해 별도 partial index 필요
 *
 * 기존 데이터: offer_id가 있는 모든 행은 그대로 유지됨 (롤백 가능).
 * 롤백 주의: offer_id=NULL 행이 있으면 down()의 NOT NULL 복원이 실패함.
 */
export class MakeOfferIdNullableAddMasterListing20260920000000 implements MigrationInterface {
  name = 'MakeOfferIdNullableAddMasterListing20260920000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. offer_id NOT NULL 제약 제거
    await queryRunner.query(`
      ALTER TABLE organization_product_listings
        ALTER COLUMN offer_id DROP NOT NULL
    `);

    // 2. master 기반 상품 고유 인덱스 추가
    //    (organization_id, service_key, master_id) WHERE offer_id IS NULL
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_org_listing_unique_master
        ON organization_product_listings (organization_id, service_key, master_id)
        WHERE offer_id IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_org_listing_unique_master
    `);

    // 주의: offer_id=NULL 행이 존재하면 실패함
    await queryRunner.query(`
      ALTER TABLE organization_product_listings
        ALTER COLUMN offer_id SET NOT NULL
    `);
  }
}
