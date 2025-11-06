-- Migration: Add GIN indexes for JSON/JSONB fields in posts table
-- Date: 2025-11-06
-- Purpose: Optimize JSON/JSONB queries to prevent full table scans
--
-- IMPORTANT: Uses CONCURRENTLY to avoid table locks during index creation
-- This migration should be run manually on production database
--
-- Estimated time for 448 rows: < 1 minute per index
-- Note: Small dataset (448 rows, ~3MB), but indexes prepared for growth

-- ============================================================================
-- GIN Index for meta field (JSON type)
-- ============================================================================
-- This index enables fast containment queries for meta field
-- Note: JSON (not JSONB) requires casting to jsonb for GIN indexing
-- Example queries that will benefit:
--   SELECT * FROM posts WHERE (meta::jsonb) @> '{"field": "value"}';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_meta_gin
  ON posts USING gin ((meta::jsonb) jsonb_path_ops);

-- ============================================================================
-- GIN Index for zones field (JSONB type)
-- ============================================================================
-- zones is already JSONB, no casting needed
-- Example queries:
--   SELECT * FROM posts WHERE zones @> '{"zone_id": "header"}';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_zones_gin
  ON posts USING gin (zones jsonb_path_ops);

-- ============================================================================
-- GIN Index for theme_customizations field (JSONB type)
-- ============================================================================
-- theme_customizations is already JSONB
-- Example queries:
--   SELECT * FROM posts WHERE theme_customizations @> '{"color": "blue"}';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_theme_gin
  ON posts USING gin (theme_customizations jsonb_path_ops);

-- ============================================================================
-- Composite Index for common query patterns
-- ============================================================================
-- Optimize queries filtering by type and status together
-- This is the most common query pattern for retrieving posts

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_type_status
  ON posts (type, status);

-- ============================================================================
-- Index for author + publishedAt (for user post listings)
-- ============================================================================
-- Useful for queries: "get all published posts by author X, ordered by date"

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_author_published
  ON posts (author_id, "publishedAt") WHERE status = 'publish';

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- After running this migration, verify indexes are being used:
--
-- EXPLAIN ANALYZE
-- SELECT * FROM posts
-- WHERE (meta::jsonb) @> '{"acf_field": "value"}';
--
-- Should show "Bitmap Index Scan on idx_posts_meta_gin"
--
-- EXPLAIN ANALYZE
-- SELECT * FROM posts
-- WHERE type = 'post' AND status = 'publish'
-- ORDER BY "publishedAt" DESC;
--
-- Should show "Index Scan using idx_posts_type_status" or similar

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================
-- DROP INDEX CONCURRENTLY IF EXISTS idx_posts_meta_gin;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_posts_zones_gin;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_posts_theme_gin;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_posts_type_status;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_posts_author_published;

-- ============================================================================
-- Performance Notes
-- ============================================================================
-- 1. CONCURRENTLY option allows reads/writes during index creation
-- 2. Current table size: ~3MB (448 rows)
-- 3. Index creation should complete in < 1 minute
-- 4. Disk space required: ~20-30% of table size per index (~5-10MB total)
-- 5. After creation, run ANALYZE posts; to update statistics
-- 6. meta field requires ::jsonb cast because it's JSON type (not JSONB)
