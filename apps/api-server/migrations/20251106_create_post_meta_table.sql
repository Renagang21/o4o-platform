-- Migration: Create post_meta table for normalized metadata storage
-- Date: 2025-11-06
-- Purpose: Replace JSON columns in posts table with proper relational structure
--
-- This migration establishes the foundation for clean metadata management:
-- - Separates ACF/custom meta from core post fields
-- - Enables efficient querying with proper indexes
-- - Maintains referential integrity
--
-- IMPORTANT: This is a clean-slate migration for zero-data environments
-- For production with existing data, use the migrate_posts_meta script instead

-- ============================================================================
-- 1. Create post_meta table
-- ============================================================================

CREATE TABLE IF NOT EXISTS post_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL,
  meta_key VARCHAR(255) NOT NULL,
  meta_value JSONB,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),

  -- Foreign key constraint with cascade delete
  CONSTRAINT fk_post_meta_post
    FOREIGN KEY (post_id)
    REFERENCES posts(id)
    ON DELETE CASCADE
);

-- ============================================================================
-- 2. Create indexes (optional for small datasets, required for production)
-- ============================================================================

-- Composite index for the most common query pattern: post_id + meta_key lookup
-- Example: SELECT meta_value FROM post_meta WHERE post_id = ? AND meta_key = 'acf_field'
CREATE INDEX IF NOT EXISTS idx_post_meta_post_key
  ON post_meta (post_id, meta_key);

-- Index for meta_key alone (useful for queries across all posts)
-- Example: SELECT * FROM post_meta WHERE meta_key = 'seo_title'
CREATE INDEX IF NOT EXISTS idx_post_meta_key
  ON post_meta (meta_key);

-- GIN index for JSONB containment queries (defer until data volume justifies it)
-- Uncomment when table has 1000+ rows with complex JSONB queries
-- CREATE INDEX IF NOT EXISTS idx_post_meta_value_gin
--   ON post_meta USING gin (meta_value jsonb_path_ops);

-- ============================================================================
-- 3. Add updated_at trigger
-- ============================================================================

-- Create trigger function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_post_meta_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to post_meta table
DROP TRIGGER IF EXISTS trigger_update_post_meta_timestamp ON post_meta;
CREATE TRIGGER trigger_update_post_meta_timestamp
  BEFORE UPDATE ON post_meta
  FOR EACH ROW
  EXECUTE FUNCTION update_post_meta_timestamp();

-- ============================================================================
-- 4. Add helpful comments
-- ============================================================================

COMMENT ON TABLE post_meta IS 'Normalized metadata storage for posts, replacing JSON columns';
COMMENT ON COLUMN post_meta.post_id IS 'References posts.id with CASCADE delete';
COMMENT ON COLUMN post_meta.meta_key IS 'Metadata key (e.g., acf_field_name, seo_title)';
COMMENT ON COLUMN post_meta.meta_value IS 'JSONB value for flexible metadata storage';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check table structure
-- \d+ post_meta

-- Check indexes
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename='post_meta';

-- Sample query pattern
-- SELECT meta_key, meta_value FROM post_meta WHERE post_id = 'some-uuid';

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================

-- DROP TRIGGER IF EXISTS trigger_update_post_meta_timestamp ON post_meta;
-- DROP FUNCTION IF EXISTS update_post_meta_timestamp();
-- DROP TABLE IF EXISTS post_meta CASCADE;
