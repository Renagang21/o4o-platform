/**
 * Add missing fields to glycopharm_products table
 *
 * WO-PRODUCT-DB-CLEANUP-FOR-SITE-V1 fields:
 * - subtitle, short_description: For better product listing/detail pages
 * - origin_country, legal_category, certification_ids: Legal and compliance info
 * - usage_info, caution_info: Product usage information
 *
 * WO-PRODUCT-IMAGES-AND-BARCODE-UNBLOCK-V1 fields:
 * - barcodes: Product identification
 * - images: Product images (JSONB array)
 *
 * This migration adds fields that exist in Entity but missing in production DB.
 */

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

-- Verify added columns
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
