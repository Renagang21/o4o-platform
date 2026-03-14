import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-A-COMMUNITY-HUB-IMPLEMENTATION-V1
 *
 * Creates community_ads and community_sponsors tables
 * for Community Hub ad/sponsor management.
 *
 * - service_code based multi-tenant filtering (Boundary Policy)
 * - No FK to avoid cross-domain coupling
 */
export class CreateCommunityHubTables1771200000015 implements MigrationInterface {
  name = 'CreateCommunityHubTables1771200000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // community_ads table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "community_ads" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "service_code" VARCHAR(50) NOT NULL DEFAULT 'kpa',
        "type" VARCHAR(20) NOT NULL,
        "title" VARCHAR(200) NOT NULL,
        "image_url" VARCHAR(500) NOT NULL,
        "link_url" VARCHAR(500),
        "start_date" DATE,
        "end_date" DATE,
        "display_order" INT NOT NULL DEFAULT 0,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_community_ads_service_type_active"
        ON "community_ads" ("service_code", "type", "is_active", "display_order")
    `);

    // community_sponsors table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "community_sponsors" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "service_code" VARCHAR(50) NOT NULL DEFAULT 'kpa',
        "name" VARCHAR(100) NOT NULL,
        "logo_url" VARCHAR(500) NOT NULL,
        "link_url" VARCHAR(500),
        "display_order" INT NOT NULL DEFAULT 0,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_community_sponsors_service_active"
        ON "community_sponsors" ("service_code", "is_active", "display_order")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_community_sponsors_service_active"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "community_sponsors"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_community_ads_service_type_active"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "community_ads"`);
  }
}
