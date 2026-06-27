import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-LINK-V1
 * 선행 IR: IR-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-LINK-MODEL-V1
 *
 * 매장 자료함 콘텐츠(kpa_store_contents) ↔ 매장 경영활용 제품 연결 조인 테이블 신설.
 *
 * 연결 기준 (확정):
 *   - O4O 기반 제품      → product_source_type='listing', product_source_id=organization_product_listings.id
 *   - 매장 경영활용 제품  → product_source_type='local',   product_source_id=store_local_products.id
 *
 * - master_id: O4O 기반 제품일 때 organization_product_listings.master_id 부가 보존(B2C 복사/공용 참조/중복 인지용).
 *              매장 경영활용 제품이면 NULL.
 * - link_type: V1 은 'product_description' 고정. 기본 상세설명서 지정(is_default 등) 없음 — 정책상 미생성.
 * - product_source_id 는 listing/local 다형 참조이므로 단일 FK 불가 → 약참조(조회 시 org 스코프 검증).
 * - content_id 는 kpa_store_contents FK CASCADE (콘텐츠 삭제 시 link 정리).
 *
 * V1 UI 는 콘텐츠 1개 → 제품 1개 연결이지만, DB 구조는 N:N 확장 가능 조인 테이블이다.
 */
export class CreateKpaStoreContentProductLinks20261128000000 implements MigrationInterface {
  name = 'CreateKpaStoreContentProductLinks20261128000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS kpa_store_content_product_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        content_id UUID NOT NULL REFERENCES kpa_store_contents(id) ON DELETE CASCADE,
        product_source_type VARCHAR(20) NOT NULL,
        product_source_id UUID NOT NULL,
        master_id UUID NULL,
        link_type VARCHAR(30) NOT NULL DEFAULT 'product_description',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_kspcl_source_type CHECK (product_source_type IN ('listing', 'local'))
      );
    `);

    // 동일 콘텐츠 ↔ 동일 제품 ↔ 동일 link_type 중복 방지.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS UQ_kspcl_org_content_product_linktype
      ON kpa_store_content_product_links
        (organization_id, content_id, product_source_type, product_source_id, link_type);
    `);

    // 콘텐츠별 연결 조회.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_kspcl_org_content
      ON kpa_store_content_product_links (organization_id, content_id);
    `);

    // 제품별 연결 콘텐츠 조회 / handled-products count 집계.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_kspcl_org_product
      ON kpa_store_content_product_links (organization_id, product_source_type, product_source_id);
    `);

    // 제품 + link_type 별 조회.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_kspcl_org_product_linktype
      ON kpa_store_content_product_links (organization_id, product_source_type, product_source_id, link_type);
    `);

    // master 기준 향후 참조(중복 listing 인지 / 공용 설명서).
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_kspcl_master
      ON kpa_store_content_product_links (master_id);
    `);

    console.log('[Migration] kpa_store_content_product_links created (content ↔ handled-product link, V1)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS kpa_store_content_product_links`);
    console.log('[Migration] kpa_store_content_product_links dropped');
  }
}
