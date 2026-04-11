import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-A-HOME-FOOTER-LINKS-MANAGEMENT-V1
 *
 * Home 하단 바로가기 링크/아이콘 관리용 테이블.
 * community_ads/community_sponsors 패턴과 동일한 구조.
 */
export class CreateCommunityQuickLinks20260411400000 implements MigrationInterface {
  name = 'CreateCommunityQuickLinks20260411400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "community_quick_links" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "service_code" VARCHAR(50) NOT NULL DEFAULT 'kpa',
        "title" VARCHAR(200) NOT NULL,
        "description" VARCHAR(500),
        "image_url" VARCHAR(500) NOT NULL,
        "link_url" VARCHAR(500) NOT NULL,
        "open_in_new_tab" BOOLEAN NOT NULL DEFAULT true,
        "display_order" INT NOT NULL DEFAULT 0,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_community_quick_links_service_active"
        ON "community_quick_links" ("service_code", "is_active", "display_order")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_community_quick_links_service_active"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "community_quick_links"`);
  }
}
