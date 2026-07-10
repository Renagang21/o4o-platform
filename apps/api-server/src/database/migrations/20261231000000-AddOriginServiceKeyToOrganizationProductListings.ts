import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-OPL-SERVICEKEY-ORIGIN-COLUMN-MIGRATION-V1
 *
 * 축 분리 1단계 — organization_product_listings 에 origin_service_key(nullable) 컬럼만 추가하는
 * 순수 additive migration. "origin 정보를 담을 그릇"만 만들며, 어떤 동작도 바꾸지 않는다.
 *
 * 원칙(WO 제약 — 반드시 유지):
 *   - 기존 row UPDATE 없음. DEFAULT NULL 이므로 기존 행은 NULL 로 읽힐 뿐 값이 변경되지 않는다.
 *   - service_key 재태깅 없음.
 *   - 유니크 인덱스 무변경:
 *       · idx_org_listing_unique_v2     UNIQUE (organization_id, service_key, offer_id)
 *       · idx_org_listing_unique_master UNIQUE (organization_id, service_key, master_id) WHERE offer_id IS NULL
 *     → origin_service_key 는 어떤 유니크 키에도 포함하지 않는다.
 *   - 인덱스/제약/쿼리/deriveListingServiceKey/resolveServiceKeys/event-offer flow 무변경.
 *
 * 타입: service_key(varchar 50) 와 동일 도메인이므로 varchar(50), nullable, DEFAULT NULL.
 * ADD COLUMN ... DEFAULT NULL 은 PostgreSQL 에서 메타데이터 변경(테이블 재작성·row 업데이트 없음)이다.
 *
 * 완료 기준: origin_service_key 컬럼이 추가되어도 기존 동작이 바뀌지 않는다.
 */
export class AddOriginServiceKeyToOrganizationProductListings20261231000000 implements MigrationInterface {
  name = 'AddOriginServiceKeyToOrganizationProductListings20261231000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE organization_product_listings
        ADD COLUMN IF NOT EXISTS origin_service_key VARCHAR(50) DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE organization_product_listings
        DROP COLUMN IF EXISTS origin_service_key
    `);
  }
}
