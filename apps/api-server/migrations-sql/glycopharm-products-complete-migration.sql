/**
 * Complete Glycopharm Products Migration
 *
 * This migration:
 * 1. Adds missing columns to glycopharm_products table
 * 2. Activates all products
 * 3. Verifies the changes
 *
 * Execute via Google Cloud Console SQL Editor or gcloud CLI
 */

-- ============================================================================
-- STEP 1: Add missing columns
-- ============================================================================

-- Add subtitle for product listing
ALTER TABLE glycopharm_products
ADD COLUMN IF NOT EXISTS subtitle VARCHAR(500);

-- Add short_description for listing pages
ALTER TABLE glycopharm_products
ADD COLUMN IF NOT EXISTS short_description TEXT;

-- Add barcodes (JSONB array)
ALTER TABLE glycopharm_products
ADD COLUMN IF NOT EXISTS barcodes JSONB;

-- Add images (JSONB array)
ALTER TABLE glycopharm_products
ADD COLUMN IF NOT EXISTS images JSONB;

-- Add origin and legal fields
ALTER TABLE glycopharm_products
ADD COLUMN IF NOT EXISTS origin_country VARCHAR(100);

ALTER TABLE glycopharm_products
ADD COLUMN IF NOT EXISTS legal_category VARCHAR(100);

ALTER TABLE glycopharm_products
ADD COLUMN IF NOT EXISTS certification_ids JSONB;

-- Add usage information
ALTER TABLE glycopharm_products
ADD COLUMN IF NOT EXISTS usage_info TEXT;

ALTER TABLE glycopharm_products
ADD COLUMN IF NOT EXISTS caution_info TEXT;

-- ============================================================================
-- STEP 2: Activate all products
-- ============================================================================

UPDATE glycopharm_products
SET status = 'active', updated_at = NOW()
WHERE status != 'active' OR status IS NULL;

-- ============================================================================
-- STEP 3: Verify changes
-- ============================================================================

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'glycopharm_products'
  AND column_name IN (
    'subtitle', 'short_description', 'barcodes', 'images',
    'origin_country', 'legal_category', 'certification_ids',
    'usage_info', 'caution_info'
  )
ORDER BY column_name;

-- Verify product counts
SELECT
  COUNT(*) as total_products,
  COUNT(*) FILTER (WHERE status = 'active') as active_products,
  COUNT(*) FILTER (WHERE status = 'draft') as draft_products,
  COUNT(*) FILTER (WHERE status = 'inactive') as inactive_products
FROM glycopharm_products;
