import type { MigrationInterface, QueryRunner } from 'typeorm';

/** WO-O4O-MEDIA-LIBRARY-V2-P0-AI-VIDEO-FOUNDATION-V1: additive, no URL changes. */
export class MediaLibraryV2Foundation20270407000000
  implements MigrationInterface
{
  name = 'MediaLibraryV2Foundation20270407000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE media_assets
      ALTER COLUMN gcs_path DROP NOT NULL,
      ADD COLUMN storage_type varchar(20) NOT NULL DEFAULT 'internal',
      ADD COLUMN provider varchar(20) NOT NULL DEFAULT 'gcs',
      ADD COLUMN external_url text,
      ADD COLUMN external_id varchar(255),
      ADD COLUMN thumbnail_url text,
      ADD COLUMN parent_asset_id uuid REFERENCES media_assets(id) ON DELETE RESTRICT,
      ADD COLUMN root_asset_id uuid REFERENCES media_assets(id) ON DELETE RESTRICT,
      ADD COLUMN derivation_type varchar(40),
      ADD COLUMN origin_type varchar(20),
      ADD COLUMN generation_provider varchar(100),
      ADD COLUMN generation_model varchar(200),
      ADD COLUMN prompt_ref varchar(500),
      ADD COLUMN generation_job_id varchar(200),
      ADD COLUMN qa_status varchar(20),
      ADD COLUMN product_accuracy_level varchar(20),
      ADD COLUMN rights_type varchar(100),
      ADD COLUMN commercial_use_allowed boolean,
      ADD COLUMN source_url text,
      ADD COLUMN attribution_required boolean,
      ADD CONSTRAINT media_storage_check CHECK (
        (storage_type = 'internal' AND provider = 'gcs' AND gcs_path IS NOT NULL AND external_url IS NULL)
        OR (storage_type = 'external' AND provider IN ('youtube','o4o') AND gcs_path IS NULL AND external_url IS NOT NULL)),
      ADD CONSTRAINT media_origin_check CHECK (origin_type IN ('original','edited','ai_generated','external')),
      ADD CONSTRAINT media_qa_check CHECK (qa_status IN ('PENDING','APPROVED','REJECTED')),
      ADD CONSTRAINT media_accuracy_check CHECK (product_accuracy_level IN ('EXACT','ACCEPTABLE','SUPPORT_ONLY','REJECTED')),
      ADD CONSTRAINT media_parent_check CHECK (parent_asset_id IS DISTINCT FROM id),
      ADD CONSTRAINT media_root_check CHECK (root_asset_id IS DISTINCT FROM id)`);
    await q.query(`CREATE TABLE media_entity_links (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      media_asset_id uuid NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
      entity_type varchar(40) NOT NULL CHECK (entity_type IN ('product','brand','content','service','video-production-job')),
      entity_id varchar(200) NOT NULL,
      purpose varchar(100) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT media_entity_link_unique UNIQUE(media_asset_id, entity_type, entity_id, purpose)
    )`);
    await q.query(
      'CREATE INDEX media_entity_target_idx ON media_entity_links(entity_type, entity_id, media_asset_id)',
    );
    await q.query(
      'CREATE INDEX media_parent_idx ON media_assets(parent_asset_id) WHERE parent_asset_id IS NOT NULL',
    );
    await q.query(
      'CREATE INDEX media_root_idx ON media_assets(root_asset_id) WHERE root_asset_id IS NOT NULL',
    );
    await q.query(
      'CREATE INDEX media_public_created_idx ON media_assets(created_at DESC, id DESC) WHERE is_library_public = true',
    );
  }
  async down(): Promise<void> {
    throw new Error(
      'Durable media references require an explicitly reviewed forward migration.',
    );
  }
}
