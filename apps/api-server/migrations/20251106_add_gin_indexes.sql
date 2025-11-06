-- Migration: Add GIN indexes for JSONB fields in post_meta table
-- Date: 2025-11-06
-- Purpose: Optimize JSONB queries to prevent full table scans
--
-- IMPORTANT: Uses CONCURRENTLY to avoid table locks during index creation
-- This migration should be run manually on production database
--
-- Estimated time for 1M rows: 5-10 minutes per index

-- ============================================================================
-- GIN Index for JSONB meta_value field
-- ============================================================================
-- This index enables fast containment queries (@>, ?, ?&, ?|)
-- Example queries that will benefit:
--   SELECT * FROM post_meta WHERE meta_value @> '{"field": "value"}';
--   SELECT * FROM post_meta WHERE meta_value ? 'field_name';
--
-- jsonb_path_ops is more efficient but only supports @> and @? operators
-- Use jsonb_ops if you need additional operators (||, -, etc.)

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_meta_value_gin
  ON post_meta USING gin (meta_value jsonb_path_ops);

-- ============================================================================
-- Composite Index for post_id + meta_key lookups
-- ============================================================================
-- This index optimizes the common pattern of:
--   SELECT * FROM post_meta WHERE post_id = ? AND meta_key = ?;
--
-- This is the most common query pattern for retrieving specific meta fields
-- for a given post

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_meta_post_key
  ON post_meta (post_id, meta_key);

-- ============================================================================
-- Additional Index for meta_key alone (if not already exists)
-- ============================================================================
-- Useful for queries that filter by meta_key across all posts:
--   SELECT * FROM post_meta WHERE meta_key = 'acf_field_name';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_meta_key
  ON post_meta (meta_key);

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- After running this migration, verify indexes are being used:
--
-- EXPLAIN ANALYZE
-- SELECT * FROM post_meta
-- WHERE meta_value @> '{"acf_field": "value"}';
--
-- Should show "Bitmap Index Scan on idx_post_meta_value_gin"
--
-- EXPLAIN ANALYZE
-- SELECT * FROM post_meta
-- WHERE post_id = 'some-uuid' AND meta_key = 'acf_field_name';
--
-- Should show "Index Scan using idx_post_meta_post_key"

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================
-- DROP INDEX CONCURRENTLY IF EXISTS idx_post_meta_value_gin;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_post_meta_post_key;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_post_meta_key;

-- ============================================================================
-- Performance Notes
-- ============================================================================
-- 1. CONCURRENTLY option allows reads/writes during index creation
-- 2. Index creation may take several minutes on large tables
-- 3. Monitor pg_stat_progress_create_index for progress
-- 4. Disk space required: ~20-30% of table size per index
-- 5. After creation, run ANALYZE post_meta; to update statistics
