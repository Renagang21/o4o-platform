-- Migration: Zero-Data Reset - Clean slate for proper schema
-- Date: 2025-11-06
-- Purpose: Reset database to clean state and remove legacy JSON columns
--
-- ⚠️  WARNING: This script DELETES ALL DATA
-- Only use in development/staging environments with no production data
--
-- This script:
-- 1. Truncates all data from posts and related tables
-- 2. Removes legacy JSON columns from posts table
-- 3. Prepares for clean post_meta architecture

-- ============================================================================
-- Safety Check
-- ============================================================================

DO $$
BEGIN
  -- Check if we're in production
  IF current_database() = 'o4o_platform_production' THEN
    RAISE EXCEPTION 'ABORT: Cannot run zero-data reset on production database!';
  END IF;

  -- Confirm posts table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') THEN
    RAISE EXCEPTION 'ABORT: posts table does not exist';
  END IF;
END $$;

-- ============================================================================
-- 1. Truncate all data (CASCADE to handle foreign keys)
-- ============================================================================

-- Truncate posts and all dependent tables
TRUNCATE TABLE post_meta RESTART IDENTITY CASCADE;
TRUNCATE TABLE posts RESTART IDENTITY CASCADE;

-- Truncate other related tables that may reference posts
-- Note: Adjust based on your actual schema
DO $$
BEGIN
  -- Only truncate if tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_categories') THEN
    TRUNCATE TABLE post_categories RESTART IDENTITY CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_tags_new') THEN
    TRUNCATE TABLE post_tags_new RESTART IDENTITY CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_autosaves') THEN
    TRUNCATE TABLE post_autosaves RESTART IDENTITY CASCADE;
  END IF;
END $$;

-- ============================================================================
-- 2. Remove legacy JSON columns from posts table
-- ============================================================================

-- Drop meta column (JSON) - replaced by post_meta table
ALTER TABLE posts DROP COLUMN IF EXISTS meta;

-- Drop postMeta column (JSON) - duplicate of meta
ALTER TABLE posts DROP COLUMN IF EXISTS postMeta;

-- Drop customFields column (JSON) - should use post_meta
ALTER TABLE posts DROP COLUMN IF EXISTS "customFields";

-- Keep zones and theme_customizations as they're JSONB and used for layout
-- These are not metadata but structural data
-- ALTER TABLE posts DROP COLUMN IF EXISTS zones;
-- ALTER TABLE posts DROP COLUMN IF EXISTS theme_customizations;

-- ============================================================================
-- 3. Verification
-- ============================================================================

-- Check table structure
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'posts'
  AND column_name IN ('meta', 'postMeta', 'customFields', 'zones', 'theme_customizations')
ORDER BY column_name;

-- Should only show zones and theme_customizations (if kept)

-- ============================================================================
-- 4. Verify data is cleared
-- ============================================================================

DO $$
DECLARE
  post_count INT;
  meta_count INT;
BEGIN
  SELECT count(*) INTO post_count FROM posts;
  SELECT count(*) INTO meta_count FROM post_meta;

  RAISE NOTICE 'Posts count: %', post_count;
  RAISE NOTICE 'Post meta count: %', meta_count;

  IF post_count != 0 OR meta_count != 0 THEN
    RAISE WARNING 'Data not fully cleared! posts: %, post_meta: %', post_count, meta_count;
  ELSE
    RAISE NOTICE '✓ All data successfully cleared';
  END IF;
END $$;

-- ============================================================================
-- Success message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ Zero-data reset completed successfully';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run seed data script for testing';
  RAISE NOTICE '2. Verify API endpoints work correctly';
  RAISE NOTICE '3. Update frontend to use /api/v1/posts';
  RAISE NOTICE '';
END $$;
