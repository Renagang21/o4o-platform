import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStoreBlogPosts1771200000006 implements MigrationInterface {
  name = 'CreateStoreBlogPosts1771200000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "store_blog_posts" (
        "id"            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "store_id"      UUID NOT NULL,
        "service_key"   VARCHAR(50) NOT NULL,
        "title"         VARCHAR(255) NOT NULL,
        "slug"          VARCHAR(150) NOT NULL,
        "excerpt"       TEXT,
        "content"       TEXT NOT NULL,
        "status"        VARCHAR(20) NOT NULL DEFAULT 'draft',
        "published_at"  TIMESTAMPTZ,
        "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX idx_store_blog_store_status
        ON store_blog_posts(store_id, status);

      CREATE UNIQUE INDEX idx_store_blog_store_slug
        ON store_blog_posts(store_id, slug);

      CREATE INDEX idx_store_blog_store_published
        ON store_blog_posts(store_id, published_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "store_blog_posts";`);
  }
}
