import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-MULTILINGUAL-PRODUCT-CONTENT-STORAGE-V1
 *
 * Store-scoped multilingual product marketing content storage.
 * - Product targets remain local/listing, scoped by organization_id.
 * - Language pages are independent marketing versions, not literal translations.
 * - No fixed content taxonomy such as feature/use/how-to/caution is imposed.
 */
export class CreateStoreMultilingualProductContent20260621010000 implements MigrationInterface {
  name = 'CreateStoreMultilingualProductContent20260621010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS store_multilingual_product_content_groups (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        service_key varchar(50),
        target_kind varchar(30) NOT NULL,
        target_id uuid NOT NULL,
        content_key varchar(80) NOT NULL DEFAULT 'default',
        title varchar(255) NOT NULL,
        default_locale varchar(10) NOT NULL DEFAULT 'ko',
        source_type varchar(40) NOT NULL DEFAULT 'store_created',
        source_ref_id uuid,
        status varchar(30) NOT NULL DEFAULT 'draft',
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_by_user_id uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT CHK_store_multilingual_product_content_groups_target_kind
          CHECK (target_kind IN ('local', 'listing')),
        CONSTRAINT CHK_store_multilingual_product_content_groups_source_type
          CHECK (source_type IN ('store_created', 'operator_hub', 'supplier_offline_imported')),
        CONSTRAINT CHK_store_multilingual_product_content_groups_status
          CHECK (status IN ('draft', 'published', 'archived'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS store_multilingual_product_content_pages (
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
        CONSTRAINT CHK_store_multilingual_product_content_pages_locale
          CHECK (locale IN ('ko', 'en', 'zh', 'ja', 'vi', 'th', 'id')),
        CONSTRAINT CHK_store_multilingual_product_content_pages_content_format
          CHECK (content_format IN ('blocks', 'html', 'image_sequence', 'json')),
        CONSTRAINT CHK_store_multilingual_product_content_pages_status
          CHECK (status IN ('draft', 'published', 'archived')),
        CONSTRAINT FK_store_multilingual_product_content_pages_group
          FOREIGN KEY (group_id)
          REFERENCES store_multilingual_product_content_groups(id)
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS UQ_store_multilingual_product_content_group_target_key
      ON store_multilingual_product_content_groups (organization_id, target_kind, target_id, content_key)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_store_multilingual_product_content_groups_org_status
      ON store_multilingual_product_content_groups (organization_id, status)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_store_multilingual_product_content_groups_target
      ON store_multilingual_product_content_groups (organization_id, target_kind, target_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_store_multilingual_product_content_groups_service_org
      ON store_multilingual_product_content_groups (service_key, organization_id)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS UQ_store_multilingual_product_content_page_locale
      ON store_multilingual_product_content_pages (group_id, locale)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_store_multilingual_product_content_pages_group_status
      ON store_multilingual_product_content_pages (group_id, status)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_store_multilingual_product_content_pages_locale
      ON store_multilingual_product_content_pages (locale)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS store_multilingual_product_content_pages');
    await queryRunner.query('DROP TABLE IF EXISTS store_multilingual_product_content_groups');
  }
}
