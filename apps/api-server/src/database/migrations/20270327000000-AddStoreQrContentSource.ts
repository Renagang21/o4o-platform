import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-QR-CANONICAL-TARGET-CONTENT-SOURCE-AND-KPA-PH-COMMONIZATION-V1
 *
 * store_qr_codes 에 **content_source** (nullable) 1 컬럼을 additive 로 추가하고,
 * 실제 참조 관계로만 판정한 값을 backfill 한다.
 *
 * 왜 필요한가
 *   landing_type 은 QR 이 "무엇을" 가리키는지(target)만 말한다. `page` 하나에
 *   자료함 사본 · 매장 직접작성 · HUB 공유 콘텐츠가 섞여 있고, `link` 안에는
 *   매장 블로그 · 다국어 상품 설명 같은 **내부 콘텐츠 참조**가 외부 URL 과 섞여 있다.
 *   원천 축을 분리해야 QR 운영 화면과 분석이 같은 의미로 수렴한다.
 *
 * 안전 계약
 *   - nullable 컬럼 1개만 추가한다. 기존 컬럼(type / slug / organization_id /
 *     landing_target_id / is_active)과 스캔 이력은 **건드리지 않는다**.
 *   - backfill 은 title/description 텍스트 추론을 하지 않는다. 각 분기는 실제 원장 행의
 *     존재를 EXISTS 로 확인하며, 어느 분기에도 걸리지 않으면 NULL(HOLD)로 남긴다.
 *   - 판정식은 services/store/store-qr-target.contract.ts 의 contentSourceClassifySql()
 *     과 동일하다. 마이그레이션은 과거 시점 기록이므로 런타임 코드를 import 하지 않고
 *     **동결 사본**을 갖는다.
 *
 * 적용 시점 프로덕션 실측(88행): TABLET_SCREEN_SET 40 · STORE_PRODUCT_LISTING 18 ·
 *   EXTERNAL_URL 10 · STORE_DIRECT 8 · EXECUTION_ASSET 6 · SHARED_CONTENT 2 ·
 *   STORE_BLOG 2 · MULTILINGUAL_PRODUCT 1 · HOLD(null) 1(대상 소실된 video QR).
 */
export class AddStoreQrContentSource20270327000000 implements MigrationInterface {
  name = 'AddStoreQrContentSource20270327000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE store_qr_codes
        ADD COLUMN IF NOT EXISTS content_source VARCHAR(40) NULL
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN store_qr_codes.content_source IS
        'QR 대상 내용의 원천(STORE_PRODUCT_LISTING/EXECUTION_ASSET/STORE_DIRECT/SHARED_CONTENT/STORE_VIDEO/TABLET_SCREEN_SET/STORE_BLOG/MULTILINGUAL_PRODUCT/EXTERNAL_URL 등). NULL=판정 보류(HOLD). canonical target 축은 landing_type.'
    `);

    // 조직별 원천 분포 조회(운영 화면 필터 · 분석 그룹핑)용 additive index.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_store_qr_codes_org_content_source"
        ON store_qr_codes (organization_id, content_source)
    `);

    // ── backfill — 실제 참조 관계로만 판정. 이미 값이 있는 행은 건드리지 않는다. ──
    await queryRunner.query(`
      UPDATE store_qr_codes q
         SET content_source = CASE
           WHEN q.landing_type = 'screen_set' AND EXISTS (
             SELECT 1 FROM store_tablet_screen_sets s
              WHERE s.id::text = q.landing_target_id AND s.organization_id = q.organization_id
           ) THEN 'TABLET_SCREEN_SET'
           WHEN q.landing_type = 'product' AND EXISTS (
             SELECT 1 FROM organization_product_listings o
              WHERE o.id::text = q.landing_target_id AND o.organization_id = q.organization_id
           ) THEN 'STORE_PRODUCT_LISTING'
           WHEN q.landing_type = 'product' AND EXISTS (
             SELECT 1 FROM supplier_product_offers spo WHERE spo.id::text = q.landing_target_id
           ) THEN 'SUPPLIER_PRODUCT_OFFER'
           WHEN q.landing_type = 'page' AND EXISTS (
             SELECT 1 FROM kpa_store_contents c
              WHERE c.id::text = q.landing_target_id
                AND c.organization_id = q.organization_id
                AND c.source_type = 'direct'
           ) THEN 'STORE_DIRECT'
           WHEN q.landing_type = 'page' AND EXISTS (
             SELECT 1 FROM kpa_contents c WHERE c.id::text = q.landing_target_id
           ) THEN 'SHARED_CONTENT'
           WHEN q.landing_type = 'page' AND q.landing_target_id IS NULL AND EXISTS (
             SELECT 1 FROM store_execution_assets a
              WHERE a.id = q.library_item_id AND a.organization_id = q.organization_id
           ) THEN 'EXECUTION_ASSET'
           WHEN q.landing_type = 'video' AND EXISTS (
             SELECT 1 FROM store_videos v WHERE v.id::text = q.landing_target_id
           ) THEN 'STORE_VIDEO'
           WHEN q.landing_type = 'link' AND EXISTS (
             SELECT 1 FROM store_blog_posts b WHERE q.landing_target_id LIKE '%/blog/' || b.slug
           ) THEN 'STORE_BLOG'
           WHEN q.landing_type = 'link' AND EXISTS (
             SELECT 1 FROM store_multilingual_product_content_groups g
              WHERE g.public_key IS NOT NULL
                AND q.landing_target_id LIKE '%/multilingual-products/' || g.public_key
           ) THEN 'MULTILINGUAL_PRODUCT'
           WHEN q.landing_type = 'link' AND q.landing_target_id ~* '^https?://' THEN 'EXTERNAL_URL'
           ELSE NULL
         END
       WHERE q.content_source IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_qr_codes_org_content_source"`);
    await queryRunner.query(`ALTER TABLE store_qr_codes DROP COLUMN IF EXISTS content_source`);
  }
}
