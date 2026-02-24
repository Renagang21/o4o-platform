import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-STORE-LOCAL-PRODUCT-CONTENT-REFINEMENT-V1
 *
 * StoreLocalProduct 콘텐츠 블록 필드 확장:
 * - summary, detail_html, usage_info, caution_info (텍스트)
 * - thumbnail_url, gallery_images (시각 요소)
 * - badge_type (PostgreSQL ENUM), highlight_flag (boolean)
 *
 * 모든 컬럼은 nullable 또는 기본값 보유 → 기존 행 영향 없음.
 * Commerce 필드 아님. Display Domain 전용.
 */
export class AddStoreLocalProductContentFields20260224400000 implements MigrationInterface {
  name = 'AddStoreLocalProductContentFields20260224400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. badge_type ENUM 생성
    await queryRunner.query(`
      CREATE TYPE "store_local_product_badge_type_enum"
        AS ENUM ('none', 'new', 'recommend', 'event')
    `);

    // 2. 콘텐츠 블록 컬럼 추가
    await queryRunner.query(`
      ALTER TABLE "store_local_products"
        ADD COLUMN "summary" text,
        ADD COLUMN "detail_html" text,
        ADD COLUMN "usage_info" text,
        ADD COLUMN "caution_info" text,
        ADD COLUMN "thumbnail_url" varchar(500),
        ADD COLUMN "gallery_images" jsonb NOT NULL DEFAULT '[]',
        ADD COLUMN "badge_type" "store_local_product_badge_type_enum" NOT NULL DEFAULT 'none',
        ADD COLUMN "highlight_flag" boolean NOT NULL DEFAULT false
    `);

    // 3. highlight 필터용 부분 인덱스
    await queryRunner.query(`
      CREATE INDEX "IDX_store_local_products_org_highlight"
        ON "store_local_products" ("organization_id", "highlight_flag")
        WHERE "highlight_flag" = true
    `);

    console.log('[AddStoreLocalProductContentFields] 8 content columns added, badge_type ENUM enforced.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 인덱스 삭제
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_store_local_products_org_highlight"
    `);

    // 컬럼 삭제
    await queryRunner.query(`
      ALTER TABLE "store_local_products"
        DROP COLUMN IF EXISTS "summary",
        DROP COLUMN IF EXISTS "detail_html",
        DROP COLUMN IF EXISTS "usage_info",
        DROP COLUMN IF EXISTS "caution_info",
        DROP COLUMN IF EXISTS "thumbnail_url",
        DROP COLUMN IF EXISTS "gallery_images",
        DROP COLUMN IF EXISTS "badge_type",
        DROP COLUMN IF EXISTS "highlight_flag"
    `);

    // ENUM 삭제
    await queryRunner.query(`
      DROP TYPE IF EXISTS "store_local_product_badge_type_enum"
    `);
  }
}
