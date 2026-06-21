import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-MULTILINGUAL-PRODUCT-CONTENT-HUB-FLOW-PILOT-V1
 *
 * Operator-side multilingual product marketing content originals (HUB blueprints).
 * - Service-scoped, organization-less, no store product target (store binds target on import).
 * - Mirrors store_multilingual_product_content_* shape; author_role hard-locked to 'operator'.
 * - Language pages are independent marketing versions, not literal translations.
 * - No fixed content taxonomy is imposed.
 */
export class CreateOperatorMultilingualProductContent20261119000000 implements MigrationInterface {
  name = 'CreateOperatorMultilingualProductContent20261119000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS operator_multilingual_product_content_groups (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        service_key varchar(50) NOT NULL,
        author_role varchar(30) NOT NULL DEFAULT 'operator',
        content_key varchar(80) NOT NULL DEFAULT 'default',
        title varchar(255) NOT NULL,
        description text,
        default_locale varchar(10) NOT NULL DEFAULT 'ko',
        status varchar(30) NOT NULL DEFAULT 'draft',
        published_at timestamptz,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT CHK_operator_multilingual_product_content_groups_author_role
          CHECK (author_role IN ('operator')),
        CONSTRAINT CHK_operator_multilingual_product_content_groups_status
          CHECK (status IN ('draft', 'published', 'archived'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS operator_multilingual_product_content_pages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id uuid NOT NULL,
        locale varchar(10) NOT NULL,
        title varchar(255) NOT NULL,
        summary text,
        content_format varchar(30) NOT NULL DEFAULT 'blocks',
        content jsonb NOT NULL DEFAULT '{}'::jsonb,
        assets jsonb NOT NULL DEFAULT '[]'::jsonb,
        buttons jsonb NOT NULL DEFAULT '[]'::jsonb,
        status varchar(30) NOT NULL DEFAULT 'draft',
        is_default boolean NOT NULL DEFAULT false,
        sort_order int NOT NULL DEFAULT 0,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT CHK_operator_multilingual_product_content_pages_locale
          CHECK (locale IN ('ko', 'en', 'zh', 'ja', 'vi', 'th', 'id')),
        CONSTRAINT CHK_operator_multilingual_product_content_pages_content_format
          CHECK (content_format IN ('blocks', 'html', 'image_sequence', 'json')),
        CONSTRAINT CHK_operator_multilingual_product_content_pages_status
          CHECK (status IN ('draft', 'published', 'archived')),
        CONSTRAINT FK_operator_multilingual_product_content_pages_group
          FOREIGN KEY (group_id)
          REFERENCES operator_multilingual_product_content_groups(id)
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_operator_multilingual_product_content_groups_hub_query
      ON operator_multilingual_product_content_groups (service_key, author_role, status)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_operator_multilingual_product_content_groups_service_updated
      ON operator_multilingual_product_content_groups (service_key, updated_at)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS UQ_operator_multilingual_product_content_page_locale
      ON operator_multilingual_product_content_pages (group_id, locale)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_operator_multilingual_product_content_pages_group_status
      ON operator_multilingual_product_content_pages (group_id, status)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_operator_multilingual_product_content_pages_locale
      ON operator_multilingual_product_content_pages (locale)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS operator_multilingual_product_content_pages');
    await queryRunner.query('DROP TABLE IF EXISTS operator_multilingual_product_content_groups');
  }
}
