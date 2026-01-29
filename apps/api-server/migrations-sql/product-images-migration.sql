-- Product Images Migration
-- WO-PRODUCT-IMAGES-AND-BARCODE-UNBLOCK-V1
-- Date: 2026-01-29

-- ============================================================================
-- 1. Add images column to glycopharm_products
-- ============================================================================
ALTER TABLE public.glycopharm_products
ADD COLUMN IF NOT EXISTS images JSONB;

-- Add GIN index for JSONB performance
CREATE INDEX IF NOT EXISTS "IDX_glycopharm_products_images"
ON public.glycopharm_products USING GIN (images);

-- ============================================================================
-- 2. Record migration in TypeORM migrations table
-- ============================================================================
INSERT INTO migrations (timestamp, name)
VALUES (1738181200000, 'AddImagesToGlycopharmProducts1738181200000')
ON CONFLICT DO NOTHING;

-- Done
SELECT 'Glycopharm images column added successfully' AS result;
