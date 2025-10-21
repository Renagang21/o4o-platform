-- ================================
-- Create JSONB Indexes for CustomPost (Option B)
-- ================================
-- This script adds GIN and expression indexes to custom_posts.customFields
-- to test the hypothesis: "JSONB + proper indexes can reach 100万 scale"
--
-- IMPORTANT: Use CREATE INDEX CONCURRENTLY in production to avoid locks
-- For benchmarking, we use regular CREATE INDEX for faster setup

-- ================================
-- 1. General GIN Index on entire customFields
-- ================================

-- This provides broad JSONB querying capability but may not be optimal for specific filters
DROP INDEX IF EXISTS idx_custom_posts_fields_gin;
CREATE INDEX idx_custom_posts_fields_gin
ON custom_posts USING GIN ("customFields");

COMMENT ON INDEX idx_custom_posts_fields_gin IS
'GIN index for general JSONB queries on customFields - supports @>, ?, ?&, ?| operators';

-- ================================
-- 2. Path-specific GIN Indexes
-- ================================

-- Alternative: jsonb_path_ops (smaller, faster but only supports @> containment)
DROP INDEX IF EXISTS idx_custom_posts_fields_gin_path;
CREATE INDEX idx_custom_posts_fields_gin_path
ON custom_posts USING GIN ("customFields" jsonb_path_ops);

COMMENT ON INDEX idx_custom_posts_fields_gin_path IS
'GIN index with jsonb_path_ops - smaller size, faster containment (@>) queries';

-- ================================
-- 3. Expression Indexes for Specific Fields
-- ================================
-- These are crucial for high-performance filtering on common product fields

-- SKU lookup (unique identifier)
DROP INDEX IF EXISTS idx_custom_posts_sku;
CREATE UNIQUE INDEX idx_custom_posts_sku
ON custom_posts (("customFields"->>'sku'));

-- Status filter (very common in queries)
DROP INDEX IF EXISTS idx_custom_posts_status_active;
CREATE INDEX idx_custom_posts_status_active
ON custom_posts ((status), (("customFields"->>'isActive')::boolean));

-- Price range queries (extremely common for e-commerce)
DROP INDEX IF EXISTS idx_custom_posts_price;
CREATE INDEX idx_custom_posts_price
ON custom_posts ((("customFields"->>'recommendedPrice')::decimal));

-- Price + Status composite (common filter combination)
DROP INDEX IF EXISTS idx_custom_posts_price_status;
CREATE INDEX idx_custom_posts_price_status
ON custom_posts (
    (("customFields"->>'recommendedPrice')::decimal),
    status
) WHERE status = 'publish';

-- Inventory queries (in-stock filtering)
DROP INDEX IF EXISTS idx_custom_posts_inventory;
CREATE INDEX idx_custom_posts_inventory
ON custom_posts ((("customFields"->>'inventory')::integer))
WHERE (("customFields"->>'trackInventory')::boolean) = true;

-- Inventory + Price composite (filtered by in-stock + price range)
DROP INDEX IF EXISTS idx_custom_posts_inventory_price;
CREATE INDEX idx_custom_posts_inventory_price
ON custom_posts (
    (("customFields"->>'inventory')::integer),
    (("customFields"->>'recommendedPrice')::decimal),
    status
) WHERE
    (("customFields"->>'trackInventory')::boolean) = true
    AND (("customFields"->>'inventory')::integer) > 0
    AND status = 'publish';

-- Category filter
DROP INDEX IF EXISTS idx_custom_posts_category;
CREATE INDEX idx_custom_posts_category
ON custom_posts ((("customFields"->>'categoryId')::uuid), status);

-- Supplier filter
DROP INDEX IF EXISTS idx_custom_posts_supplier;
CREATE INDEX idx_custom_posts_supplier
ON custom_posts ((("customFields"->>'supplierId')::uuid), status);

-- Brand filter (common in product catalogs)
DROP INDEX IF EXISTS idx_custom_posts_brand;
CREATE INDEX idx_custom_posts_brand
ON custom_posts (("customFields"->>'brand'))
WHERE ("customFields"->>'brand') IS NOT NULL;

-- ================================
-- 4. Text Search Indexes
-- ================================

-- Full-text search on title + content
DROP INDEX IF EXISTS idx_custom_posts_fulltext;
CREATE INDEX idx_custom_posts_fulltext
ON custom_posts USING GIN (
    to_tsvector('english', title || ' ' || COALESCE(content, '') || ' ' || COALESCE("customFields"->>'brand', ''))
);

-- ================================
-- 5. Sorting Indexes
-- ================================

-- Created date sorting (newest first - very common)
DROP INDEX IF EXISTS idx_custom_posts_created_desc;
CREATE INDEX idx_custom_posts_created_desc
ON custom_posts ("createdAt" DESC, status)
WHERE status = 'publish';

-- Price sorting (low to high, high to low)
DROP INDEX IF EXISTS idx_custom_posts_price_sort;
CREATE INDEX idx_custom_posts_price_sort
ON custom_posts (
    (("customFields"->>'recommendedPrice')::decimal) ASC,
    status
) WHERE status = 'publish';

-- ================================
-- Index Size Analysis
-- ================================

-- Query to check index sizes after creation
CREATE OR REPLACE VIEW v_custompost_index_sizes AS
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'custom_posts'
ORDER BY pg_relation_size(indexrelid) DESC;

-- ================================
-- Statistics Update
-- ================================

-- Update statistics for query planner
ANALYZE custom_posts;

-- ================================
-- Summary Report
-- ================================

DO $$
DECLARE
    total_rows BIGINT;
    total_table_size TEXT;
    total_indexes_size TEXT;
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_rows FROM custom_posts;
    SELECT pg_size_pretty(pg_total_relation_size('custom_posts')) INTO total_table_size;
    SELECT pg_size_pretty(pg_indexes_size('custom_posts')) INTO total_indexes_size;
    SELECT COUNT(*) INTO index_count FROM pg_indexes WHERE tablename = 'custom_posts';

    RAISE NOTICE '========================================';
    RAISE NOTICE 'CustomPost JSONB Indexing Summary';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total rows: %', total_rows;
    RAISE NOTICE 'Table size: %', total_table_size;
    RAISE NOTICE 'Indexes size: %', total_indexes_size;
    RAISE NOTICE 'Number of indexes: %', index_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Query the view: SELECT * FROM v_custompost_index_sizes;';
    RAISE NOTICE '========================================';
END $$;
