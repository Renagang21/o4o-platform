import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-STORE-BLOG-META-V1
 *
 * store_blog_settings — Blog identity (이름·소개·대표 이미지·기본 template) 메타.
 *  - storeId UNIQUE: 매장당 1 row
 *  - service_key 인덱스: multi-service 분리
 *  - blog_name/description/hero_image: nullable — public fallback 흐름에서 store info 로 대체
 *  - default_template: 'professional' default — 향후 유료 template 추가 가능 (varchar)
 */
export class CreateStoreBlogSettings20260918000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "store_blog_settings" (
        "id"               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "store_id"         UUID NOT NULL,
        "service_key"      VARCHAR(50) NOT NULL,
        "blog_name"        VARCHAR(200),
        "description"      TEXT,
        "hero_image"       VARCHAR(500),
        "default_template" VARCHAR(50) NOT NULL DEFAULT 'professional',
        "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "uq_store_blog_settings_store_id" UNIQUE ("store_id")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_store_blog_settings_service_key"
        ON "store_blog_settings" ("service_key");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_store_blog_settings_service_key";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "store_blog_settings";`);
  }
}
