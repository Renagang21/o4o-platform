-- ================================
-- Create Materialized Views (Option C)
-- ================================
-- This script creates materialized views for fast product search
-- Hypothesis: MV can provide dedicated-table performance for read operations
-- Trade-off: Refresh strategy and write-read consistency

-- ================================
-- 1. Main Product Search View (from CustomPost)
-- ================================

DROP MATERIALIZED VIEW IF EXISTS mv_product_search CASCADE;

CREATE MATERIALIZED VIEW mv_product_search AS
SELECT
    cp.id,
    cp.slug,
    cp.title AS name,
    cp.content AS description,
    cp.status,
    cp."createdAt" AS created_at,
    cp."publishedAt" AS published_at,

    -- Extract frequently queried fields from JSONB
    ("customFields"->>'sku') AS sku,
    ("customFields"->>'type') AS type,
    (("customFields"->>'isActive')::boolean) AS is_active,
    (("customFields"->>'supplierPrice')::decimal) AS supplier_price,
    (("customFields"->>'recommendedPrice')::decimal) AS recommended_price,
    (("customFields"->>'comparePrice')::decimal) AS compare_price,
    ("customFields"->>'currency') AS currency,
    (("customFields"->>'inventory')::integer) AS inventory,
    (("customFields"->>'trackInventory')::boolean) AS track_inventory,
    (("customFields"->>'supplierId')::uuid) AS supplier_id,
    (("customFields"->>'categoryId')::uuid) AS category_id,
    ("customFields"->>'brand') AS brand,
    ("customFields"->>'model') AS model,

    -- Computed fields
    CASE
        WHEN (("customFields"->>'trackInventory')::boolean) = true
             AND (("customFields"->>'inventory')::integer) > 0
             AND cp.status = 'publish'
        THEN true
        WHEN (("customFields"->>'trackInventory')::boolean) = false
             AND cp.status = 'publish'
        THEN true
        ELSE false
    END AS in_stock,

    -- Price discount percentage
    CASE
        WHEN ("customFields"->>'comparePrice') IS NOT NULL
             AND (("customFields"->>'comparePrice')::decimal) > (("customFields"->>'recommendedPrice')::decimal)
        THEN ROUND(
            (
                ((("customFields"->>'comparePrice')::decimal) - (("customFields"->>'recommendedPrice')::decimal))
                / (("customFields"->>'comparePrice')::decimal)
            ) * 100
        )
        ELSE 0
    END AS discount_percentage,

    -- Search vector for full-text search
    to_tsvector('english',
        cp.title || ' ' ||
        COALESCE(cp.content, '') || ' ' ||
        COALESCE("customFields"->>'brand', '') || ' ' ||
        COALESCE("customFields"->>'model', '')
    ) AS search_vector,

    -- Metadata
    ("customFields"->'metadata'->>'rating')::decimal AS rating,
    ("customFields"->'metadata'->>'reviewCount')::integer AS review_count,

    -- Keep original JSONB for less common fields
    "customFields" AS all_fields

FROM custom_posts cp
WHERE cp."postTypeId" IN (
    SELECT id FROM custom_post_types WHERE slug = 'benchmark-product'
);

-- ================================
-- 2. Indexes on Materialized View
-- ================================

-- Primary key equivalent
CREATE UNIQUE INDEX mv_product_search_id_idx ON mv_product_search(id);
CREATE UNIQUE INDEX mv_product_search_sku_idx ON mv_product_search(sku);
CREATE UNIQUE INDEX mv_product_search_slug_idx ON mv_product_search(slug);

-- Common filters
CREATE INDEX mv_product_search_status_idx ON mv_product_search(status);
CREATE INDEX mv_product_search_active_idx ON mv_product_search(is_active, status);
CREATE INDEX mv_product_search_in_stock_idx ON mv_product_search(in_stock) WHERE in_stock = true;

-- Price queries
CREATE INDEX mv_product_search_price_idx ON mv_product_search(recommended_price);
CREATE INDEX mv_product_search_price_status_idx ON mv_product_search(recommended_price, status) WHERE status = 'publish';

-- Inventory
CREATE INDEX mv_product_search_inventory_idx ON mv_product_search(inventory) WHERE track_inventory = true;

-- Category and supplier
CREATE INDEX mv_product_search_category_idx ON mv_product_search(category_id, status);
CREATE INDEX mv_product_search_supplier_idx ON mv_product_search(supplier_id, status);

-- Brand
CREATE INDEX mv_product_search_brand_idx ON mv_product_search(brand) WHERE brand IS NOT NULL;

-- Full-text search
CREATE INDEX mv_product_search_fts_idx ON mv_product_search USING GIN(search_vector);

-- Sorting indexes
CREATE INDEX mv_product_search_created_desc_idx ON mv_product_search(created_at DESC, status);
CREATE INDEX mv_product_search_price_asc_idx ON mv_product_search(recommended_price ASC, status) WHERE status = 'publish';
CREATE INDEX mv_product_search_price_desc_idx ON mv_product_search(recommended_price DESC, status) WHERE status = 'publish';
CREATE INDEX mv_product_search_rating_idx ON mv_product_search(rating DESC NULLS LAST) WHERE rating IS NOT NULL;

-- ================================
-- 3. Refresh Strategy Functions
-- ================================

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_product_search_view()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_search;
    RAISE NOTICE 'Materialized view mv_product_search refreshed successfully';
END;
$$ LANGUAGE plpgsql;

-- Function to perform incremental refresh (for newer PostgreSQL or custom logic)
-- Note: True incremental refresh requires more complex logic or PostgreSQL 13+ with incremental MV
CREATE OR REPLACE FUNCTION incremental_refresh_product_search(since_timestamp TIMESTAMP)
RETURNS VOID AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    -- This is a simplified version - in production, you'd use DELETE + INSERT for changed rows
    -- For now, we just do a full refresh
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_search;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Incremental refresh completed, % rows affected', affected_rows;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- 4. Trigger-based Auto-Refresh (Optional)
-- ================================
-- WARNING: This can impact write performance significantly
-- Only use if real-time consistency is critical

-- Track when last refresh occurred
CREATE TABLE IF NOT EXISTS mv_refresh_log (
    view_name VARCHAR(255) PRIMARY KEY,
    last_refresh_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    refresh_duration_ms INTEGER,
    rows_affected INTEGER
);

INSERT INTO mv_refresh_log (view_name, last_refresh_at)
VALUES ('mv_product_search', CURRENT_TIMESTAMP)
ON CONFLICT (view_name) DO NOTHING;

-- Function to refresh with logging
CREATE OR REPLACE FUNCTION refresh_product_search_with_logging()
RETURNS VOID AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration_ms INTEGER;
BEGIN
    start_time := clock_timestamp();

    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_search;

    end_time := clock_timestamp();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;

    UPDATE mv_refresh_log
    SET
        last_refresh_at = end_time,
        refresh_duration_ms = duration_ms
    WHERE view_name = 'mv_product_search';

    RAISE NOTICE 'MV refresh completed in % ms', duration_ms;
END;
$$ LANGUAGE plpgsql;

-- Optional: Trigger to auto-refresh after custom_posts changes
-- DISABLED BY DEFAULT - uncomment to enable
/*
CREATE OR REPLACE FUNCTION trigger_refresh_product_search()
RETURNS TRIGGER AS $$
BEGIN
    -- Use pg_notify to schedule async refresh instead of blocking
    PERFORM pg_notify('refresh_product_search', '');
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_custom_posts_change
AFTER INSERT OR UPDATE OR DELETE ON custom_posts
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_product_search();
*/

-- ================================
-- 5. View Size and Statistics
-- ================================

CREATE OR REPLACE VIEW v_mv_product_search_stats AS
SELECT
    'mv_product_search' AS view_name,
    COUNT(*) AS total_rows,
    pg_size_pretty(pg_total_relation_size('mv_product_search')) AS total_size,
    pg_size_pretty(pg_relation_size('mv_product_search')) AS table_size,
    pg_size_pretty(pg_indexes_size('mv_product_search')) AS indexes_size,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'mv_product_search') AS index_count,
    (SELECT last_refresh_at FROM mv_refresh_log WHERE view_name = 'mv_product_search') AS last_refresh,
    (SELECT refresh_duration_ms FROM mv_refresh_log WHERE view_name = 'mv_product_search') AS last_refresh_duration_ms
FROM mv_product_search;

-- ================================
-- 6. Initial Refresh and Analysis
-- ================================

REFRESH MATERIALIZED VIEW mv_product_search;
ANALYZE mv_product_search;

-- ================================
-- Summary Report
-- ================================

DO $$
DECLARE
    row_count BIGINT;
    total_size TEXT;
    indexes_size TEXT;
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO row_count FROM mv_product_search;
    SELECT pg_size_pretty(pg_total_relation_size('mv_product_search')) INTO total_size;
    SELECT pg_size_pretty(pg_indexes_size('mv_product_search')) INTO indexes_size;
    SELECT COUNT(*) INTO index_count FROM pg_indexes WHERE tablename = 'mv_product_search';

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Materialized View Summary';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'View: mv_product_search';
    RAISE NOTICE 'Total rows: %', row_count;
    RAISE NOTICE 'Total size: %', total_size;
    RAISE NOTICE 'Indexes size: %', indexes_size;
    RAISE NOTICE 'Number of indexes: %', index_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Refresh commands:';
    RAISE NOTICE '  Manual: SELECT refresh_product_search_view();';
    RAISE NOTICE '  With logging: SELECT refresh_product_search_with_logging();';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'View stats: SELECT * FROM v_mv_product_search_stats;';
    RAISE NOTICE '========================================';
END $$;
