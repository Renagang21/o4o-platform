import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Forum Core Migration 003 - Add Full-Text Search
 *
 * Phase 15-A: Forum Full-text Search Engine
 *
 * Adds:
 * - content_text column (extracted plain text from Block[] content)
 * - search_vector column (tsvector for PostgreSQL full-text search)
 * - GIN index for efficient full-text search
 * - Trigger to auto-update search_vector on insert/update
 */
export class ForumCoreMigration003AddFulltextSearch implements MigrationInterface {
  name = 'ForumCoreMigration003AddFulltextSearch';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[Migration 003] Adding full-text search columns to forum_post...');

    // Step 1: Add content_text column for extracted plain text from Block[]
    await queryRunner.query(`
      ALTER TABLE forum_post
      ADD COLUMN IF NOT EXISTS content_text TEXT;
    `);
    console.log('[Migration 003] Added content_text column');

    // Step 2: Add search_vector column for full-text search
    await queryRunner.query(`
      ALTER TABLE forum_post
      ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;
    `);
    console.log('[Migration 003] Added search_vector column');

    // Step 3: Create function to extract text from JSONB Block[] content
    // This function extracts plain text from the Block[] structure
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION extract_blocks_text(blocks JSONB)
      RETURNS TEXT AS $$
      DECLARE
        block JSONB;
        result TEXT := '';
        content_text TEXT;
      BEGIN
        IF blocks IS NULL OR jsonb_typeof(blocks) != 'array' THEN
          RETURN '';
        END IF;

        FOR block IN SELECT * FROM jsonb_array_elements(blocks)
        LOOP
          -- Extract text from content field
          IF block->>'content' IS NOT NULL THEN
            IF jsonb_typeof(block->'content') = 'string' THEN
              content_text := block->>'content';
            ELSIF block->'content'->>'text' IS NOT NULL THEN
              content_text := block->'content'->>'text';
            ELSIF block->'content'->>'title' IS NOT NULL THEN
              content_text := COALESCE(block->'content'->>'title', '') || ' ' ||
                              COALESCE(block->'content'->>'description', '');
            ELSE
              content_text := '';
            END IF;
            result := result || ' ' || COALESCE(content_text, '');
          END IF;

          -- Extract from nested blocks (children/innerBlocks)
          IF block->'children' IS NOT NULL AND jsonb_typeof(block->'children') = 'array' THEN
            result := result || ' ' || extract_blocks_text(block->'children');
          END IF;
          IF block->'innerBlocks' IS NOT NULL AND jsonb_typeof(block->'innerBlocks') = 'array' THEN
            result := result || ' ' || extract_blocks_text(block->'innerBlocks');
          END IF;

          -- Extract from attributes (alt, caption)
          IF block->'attributes'->>'alt' IS NOT NULL THEN
            result := result || ' ' || block->'attributes'->>'alt';
          END IF;
          IF block->'attributes'->>'caption' IS NOT NULL THEN
            result := result || ' ' || block->'attributes'->>'caption';
          END IF;
        END LOOP;

        RETURN TRIM(result);
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);
    console.log('[Migration 003] Created extract_blocks_text function');

    // Step 4: Create function to extract searchable text from metadata
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION extract_metadata_text(metadata JSONB)
      RETURNS TEXT AS $$
      DECLARE
        result TEXT := '';
        extensions JSONB;
        neture JSONB;
        yaksa JSONB;
      BEGIN
        IF metadata IS NULL THEN
          RETURN '';
        END IF;

        -- Extract SEO fields
        IF metadata->'seo' IS NOT NULL THEN
          result := result || ' ' || COALESCE(metadata->'seo'->>'title', '');
          result := result || ' ' || COALESCE(metadata->'seo'->>'description', '');
          IF metadata->'seo'->'keywords' IS NOT NULL THEN
            result := result || ' ' || (
              SELECT string_agg(k::TEXT, ' ')
              FROM jsonb_array_elements_text(metadata->'seo'->'keywords') AS k
            );
          END IF;
        END IF;

        -- Get extensions
        extensions := COALESCE(metadata->'extensions', '{}'::JSONB);

        -- Extract Neture (cosmetics) metadata
        neture := COALESCE(extensions->'neture', metadata->'neture');
        IF neture IS NOT NULL THEN
          result := result || ' ' || COALESCE(neture->>'skinType', '');
          IF neture->'concerns' IS NOT NULL THEN
            result := result || ' ' || (
              SELECT string_agg(c::TEXT, ' ')
              FROM jsonb_array_elements_text(neture->'concerns') AS c
            );
          END IF;
          IF neture->'routine' IS NOT NULL THEN
            result := result || ' ' || (
              SELECT string_agg(r::TEXT, ' ')
              FROM jsonb_array_elements_text(neture->'routine') AS r
            );
          END IF;
        END IF;

        -- Extract Yaksa metadata
        yaksa := COALESCE(extensions->'yaksa', metadata->'yaksa');
        IF yaksa IS NOT NULL THEN
          result := result || ' ' || COALESCE(yaksa->>'communityId', '');
        END IF;

        RETURN TRIM(result);
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);
    console.log('[Migration 003] Created extract_metadata_text function');

    // Step 5: Create function to build the full search vector
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION build_forum_post_search_vector(
        p_title VARCHAR,
        p_content JSONB,
        p_excerpt TEXT,
        p_tags TEXT,
        p_metadata JSONB
      )
      RETURNS TSVECTOR AS $$
      DECLARE
        content_text TEXT;
        metadata_text TEXT;
        tags_text TEXT;
      BEGIN
        -- Extract content text
        content_text := COALESCE(extract_blocks_text(p_content), '');

        -- Extract metadata text
        metadata_text := COALESCE(extract_metadata_text(p_metadata), '');

        -- Normalize tags (simple-array format: comma-separated)
        tags_text := COALESCE(p_tags, '');

        -- Build weighted search vector
        -- A (highest): title
        -- B: tags and excerpt
        -- C: content
        -- D (lowest): metadata
        RETURN
          setweight(to_tsvector('simple', COALESCE(p_title, '')), 'A') ||
          setweight(to_tsvector('simple', COALESCE(p_excerpt, '') || ' ' || REPLACE(tags_text, ',', ' ')), 'B') ||
          setweight(to_tsvector('simple', content_text), 'C') ||
          setweight(to_tsvector('simple', metadata_text), 'D');
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);
    console.log('[Migration 003] Created build_forum_post_search_vector function');

    // Step 6: Create trigger function to auto-update search_vector
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_forum_post_search_vector()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Update content_text
        NEW.content_text := extract_blocks_text(NEW.content);

        -- Update search_vector
        NEW.search_vector := build_forum_post_search_vector(
          NEW.title,
          NEW.content,
          NEW.excerpt,
          NEW.tags,
          NEW.metadata
        );

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('[Migration 003] Created update_forum_post_search_vector trigger function');

    // Step 7: Create trigger on forum_post
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_forum_post_search_vector ON forum_post;
      CREATE TRIGGER trg_forum_post_search_vector
        BEFORE INSERT OR UPDATE ON forum_post
        FOR EACH ROW
        EXECUTE FUNCTION update_forum_post_search_vector();
    `);
    console.log('[Migration 003] Created search vector trigger');

    // Step 8: Create GIN index for full-text search
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_forum_post_search_vector
      ON forum_post
      USING GIN (search_vector);
    `);
    console.log('[Migration 003] Created GIN index on search_vector');

    // Step 9: Create index on content_text for additional text search
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_forum_post_content_text
      ON forum_post
      USING GIN (to_tsvector('simple', COALESCE(content_text, '')));
    `);
    console.log('[Migration 003] Created GIN index on content_text');

    // Step 10: Backfill existing posts with search vectors
    console.log('[Migration 003] Backfilling existing posts with search vectors...');
    await queryRunner.query(`
      UPDATE forum_post
      SET
        content_text = extract_blocks_text(content),
        search_vector = build_forum_post_search_vector(title, content, excerpt, tags, metadata)
      WHERE search_vector IS NULL OR content_text IS NULL;
    `);
    console.log('[Migration 003] Backfill complete');

    console.log('[Migration 003] Full-text search setup complete!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('[Migration 003] Rolling back full-text search...');

    // Drop trigger
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_forum_post_search_vector ON forum_post;
    `);

    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_forum_post_search_vector;
      DROP INDEX IF EXISTS idx_forum_post_content_text;
    `);

    // Drop functions
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS update_forum_post_search_vector();
      DROP FUNCTION IF EXISTS build_forum_post_search_vector(VARCHAR, JSONB, TEXT, TEXT, JSONB);
      DROP FUNCTION IF EXISTS extract_metadata_text(JSONB);
      DROP FUNCTION IF EXISTS extract_blocks_text(JSONB);
    `);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE forum_post DROP COLUMN IF EXISTS search_vector;
      ALTER TABLE forum_post DROP COLUMN IF EXISTS content_text;
    `);

    console.log('[Migration 003] Full-text search rollback complete');
  }
}
