-- ================================
-- Benchmark Query Scenarios
-- ================================
-- This script defines realistic e-commerce queries to benchmark
-- across all three options:
--   A) Dedicated Product table (benchmark_products)
--   B) CustomPost with JSONB (custom_posts)
--   C) Materialized View (mv_product_search)
--
-- Each query is run with EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
-- Metrics to capture: execution time, buffers, index usage

-- ================================
-- Benchmark Configuration
-- ================================

-- Enable timing and detailed output
\timing on
SET work_mem = '256MB';
SET random_page_cost = 1.1;  -- For SSD
SET effective_cache_size = '4GB';

-- ================================
-- Scenario 1: Single Product Lookup by SKU
-- ================================
-- Most common query: direct product access
-- Expected: < 1ms with unique index

\echo '========================================'
\echo 'Scenario 1: Single Product Lookup by SKU'
\echo '========================================'

\echo 'Option A: Dedicated Product Table'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM benchmark_products
WHERE sku = 'SKU-00050000'
LIMIT 1;

\echo 'Option B: CustomPost JSONB (with index)'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM custom_posts
WHERE "customFields"->>'sku' = 'SKU-00050000'
LIMIT 1;

\echo 'Option C: Materialized View'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM mv_product_search
WHERE sku = 'SKU-00050000'
LIMIT 1;

-- ================================
-- Scenario 2: Category Pagination (Newest First)
-- ================================
-- Very common: browsing products in a category
-- Expected: < 50ms for first page with proper indexes

\echo '========================================'
\echo 'Scenario 2: Category Pagination - Page 1'
\echo '========================================'

\echo 'Option A: Dedicated Product Table'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, name, sku, recommended_price, inventory, created_at
FROM benchmark_products
WHERE category_id = (SELECT id FROM benchmark_categories ORDER BY RANDOM() LIMIT 1)
  AND status = 'active'
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;

\echo 'Option B: CustomPost JSONB'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
    id,
    title,
    "customFields"->>'sku' AS sku,
    ("customFields"->>'recommendedPrice')::decimal AS price,
    ("customFields"->>'inventory')::integer AS inventory,
    "createdAt"
FROM custom_posts
WHERE ("customFields"->>'categoryId')::uuid = (SELECT id FROM benchmark_categories ORDER BY RANDOM() LIMIT 1)
  AND status = 'publish'
ORDER BY "createdAt" DESC
LIMIT 20 OFFSET 0;

\echo 'Option C: Materialized View'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, name, sku, recommended_price, inventory, created_at
FROM mv_product_search
WHERE category_id = (SELECT id FROM benchmark_categories ORDER BY RANDOM() LIMIT 1)
  AND status = 'publish'
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;

-- ================================
-- Scenario 3: Price Range + In-Stock Filter
-- ================================
-- E-commerce filter: price range + available only
-- Expected: < 100ms with composite indexes

\echo '========================================'
\echo 'Scenario 3: Price Range + In-Stock Filter'
\echo '========================================'

\echo 'Option A: Dedicated Product Table'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, name, sku, recommended_price, inventory
FROM benchmark_products
WHERE recommended_price BETWEEN 50000 AND 150000
  AND inventory > 0
  AND status = 'active'
  AND track_inventory = true
ORDER BY recommended_price ASC
LIMIT 50;

\echo 'Option B: CustomPost JSONB'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
    id,
    title,
    "customFields"->>'sku' AS sku,
    ("customFields"->>'recommendedPrice')::decimal AS price,
    ("customFields"->>'inventory')::integer AS inventory
FROM custom_posts
WHERE ("customFields"->>'recommendedPrice')::decimal BETWEEN 50000 AND 150000
  AND ("customFields"->>'inventory')::integer > 0
  AND status = 'publish'
  AND ("customFields"->>'trackInventory')::boolean = true
ORDER BY ("customFields"->>'recommendedPrice')::decimal ASC
LIMIT 50;

\echo 'Option C: Materialized View'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, name, sku, recommended_price, inventory
FROM mv_product_search
WHERE recommended_price BETWEEN 50000 AND 150000
  AND inventory > 0
  AND status = 'publish'
  AND track_inventory = true
ORDER BY recommended_price ASC
LIMIT 50;

-- ================================
-- Scenario 4: Multi-Filter Search (Complex)
-- ================================
-- Advanced filter: category + price + in-stock + brand
-- Expected: < 200ms with proper indexes

\echo '========================================'
\echo 'Scenario 4: Multi-Filter Search'
\echo '========================================'

\echo 'Option A: Dedicated Product Table'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, name, sku, brand, recommended_price, inventory
FROM benchmark_products
WHERE category_id = (SELECT id FROM benchmark_categories ORDER BY RANDOM() LIMIT 1)
  AND recommended_price BETWEEN 30000 AND 200000
  AND inventory > 0
  AND brand IN ('Samsung', 'LG', 'Apple')
  AND status = 'active'
ORDER BY recommended_price ASC
LIMIT 30;

\echo 'Option B: CustomPost JSONB'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
    id,
    title,
    "customFields"->>'sku' AS sku,
    "customFields"->>'brand' AS brand,
    ("customFields"->>'recommendedPrice')::decimal AS price,
    ("customFields"->>'inventory')::integer AS inventory
FROM custom_posts
WHERE ("customFields"->>'categoryId')::uuid = (SELECT id FROM benchmark_categories ORDER BY RANDOM() LIMIT 1)
  AND ("customFields"->>'recommendedPrice')::decimal BETWEEN 30000 AND 200000
  AND ("customFields"->>'inventory')::integer > 0
  AND "customFields"->>'brand' IN ('Samsung', 'LG', 'Apple')
  AND status = 'publish'
ORDER BY ("customFields"->>'recommendedPrice')::decimal ASC
LIMIT 30;

\echo 'Option C: Materialized View'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, name, sku, brand, recommended_price, inventory
FROM mv_product_search
WHERE category_id = (SELECT id FROM benchmark_categories ORDER BY RANDOM() LIMIT 1)
  AND recommended_price BETWEEN 30000 AND 200000
  AND inventory > 0
  AND brand IN ('Samsung', 'LG', 'Apple')
  AND status = 'publish'
ORDER BY recommended_price ASC
LIMIT 30;

-- ================================
-- Scenario 5: Full-Text Search
-- ================================
-- Search query with text matching
-- Expected: < 150ms with full-text indexes

\echo '========================================'
\echo 'Scenario 5: Full-Text Search'
\echo '========================================'

\echo 'Option A: Dedicated Product Table'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, name, sku, brand, recommended_price
FROM benchmark_products
WHERE to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(brand, ''))
      @@ to_tsquery('english', 'Samsung | LG | quality')
  AND status = 'active'
ORDER BY recommended_price DESC
LIMIT 30;

\echo 'Option B: CustomPost JSONB'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
    id,
    title,
    "customFields"->>'sku' AS sku,
    "customFields"->>'brand' AS brand,
    ("customFields"->>'recommendedPrice')::decimal AS price
FROM custom_posts
WHERE to_tsvector('english', title || ' ' || COALESCE(content, '') || ' ' || COALESCE("customFields"->>'brand', ''))
      @@ to_tsquery('english', 'Samsung | LG | quality')
  AND status = 'publish'
ORDER BY ("customFields"->>'recommendedPrice')::decimal DESC
LIMIT 30;

\echo 'Option C: Materialized View'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, name, sku, brand, recommended_price
FROM mv_product_search
WHERE search_vector @@ to_tsquery('english', 'Samsung | LG | quality')
  AND status = 'publish'
ORDER BY recommended_price DESC
LIMIT 30;

-- ================================
-- Scenario 6: Deep Pagination
-- ================================
-- Stress test: page 100 (offset 2000)
-- Expected: performance degradation, but acceptable < 500ms

\echo '========================================'
\echo 'Scenario 6: Deep Pagination (Page 100)'
\echo '========================================'

\echo 'Option A: Dedicated Product Table'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, name, sku, recommended_price
FROM benchmark_products
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 20 OFFSET 2000;

\echo 'Option B: CustomPost JSONB'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, title, "customFields"->>'sku' AS sku, ("customFields"->>'recommendedPrice')::decimal AS price
FROM custom_posts
WHERE status = 'publish'
ORDER BY "createdAt" DESC
LIMIT 20 OFFSET 2000;

\echo 'Option C: Materialized View'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, name, sku, recommended_price
FROM mv_product_search
WHERE status = 'publish'
ORDER BY created_at DESC
LIMIT 20 OFFSET 2000;

-- ================================
-- Scenario 7: Aggregation Query
-- ================================
-- Analytics: count products by brand and avg price
-- Expected: < 300ms

\echo '========================================'
\echo 'Scenario 7: Aggregation by Brand'
\echo '========================================'

\echo 'Option A: Dedicated Product Table'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
    brand,
    COUNT(*) AS product_count,
    ROUND(AVG(recommended_price)::numeric, 2) AS avg_price,
    MIN(recommended_price) AS min_price,
    MAX(recommended_price) AS max_price
FROM benchmark_products
WHERE status = 'active'
  AND brand IS NOT NULL
GROUP BY brand
ORDER BY product_count DESC
LIMIT 10;

\echo 'Option B: CustomPost JSONB'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
    "customFields"->>'brand' AS brand,
    COUNT(*) AS product_count,
    ROUND(AVG(("customFields"->>'recommendedPrice')::decimal)::numeric, 2) AS avg_price,
    MIN(("customFields"->>'recommendedPrice')::decimal) AS min_price,
    MAX(("customFields"->>'recommendedPrice')::decimal) AS max_price
FROM custom_posts
WHERE status = 'publish'
  AND "customFields"->>'brand' IS NOT NULL
GROUP BY "customFields"->>'brand'
ORDER BY product_count DESC
LIMIT 10;

\echo 'Option C: Materialized View'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
    brand,
    COUNT(*) AS product_count,
    ROUND(AVG(recommended_price)::numeric, 2) AS avg_price,
    MIN(recommended_price) AS min_price,
    MAX(recommended_price) AS max_price
FROM mv_product_search
WHERE status = 'publish'
  AND brand IS NOT NULL
GROUP BY brand
ORDER BY product_count DESC
LIMIT 10;

-- ================================
-- Scenario 8: Sorting by Different Columns
-- ================================
-- Test index usage for different sort orders

\echo '========================================'
\echo 'Scenario 8: Sort by Price DESC'
\echo '========================================'

\echo 'Option A: Dedicated Product Table'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, name, recommended_price
FROM benchmark_products
WHERE status = 'active'
ORDER BY recommended_price DESC
LIMIT 50;

\echo 'Option B: CustomPost JSONB'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, title, ("customFields"->>'recommendedPrice')::decimal AS price
FROM custom_posts
WHERE status = 'publish'
ORDER BY ("customFields"->>'recommendedPrice')::decimal DESC
LIMIT 50;

\echo 'Option C: Materialized View'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, name, recommended_price
FROM mv_product_search
WHERE status = 'publish'
ORDER BY recommended_price DESC
LIMIT 50;

-- ================================
-- Summary Statistics
-- ================================

\echo '========================================'
\echo 'Database Statistics Summary'
\echo '========================================'

SELECT
    'benchmark_products' AS table_name,
    COUNT(*) AS row_count,
    pg_size_pretty(pg_total_relation_size('benchmark_products')) AS total_size,
    pg_size_pretty(pg_indexes_size('benchmark_products')) AS indexes_size
FROM benchmark_products
UNION ALL
SELECT
    'custom_posts' AS table_name,
    COUNT(*) AS row_count,
    pg_size_pretty(pg_total_relation_size('custom_posts')) AS total_size,
    pg_size_pretty(pg_indexes_size('custom_posts')) AS indexes_size
FROM custom_posts
WHERE "postTypeId" IN (SELECT id FROM custom_post_types WHERE slug = 'benchmark-product')
UNION ALL
SELECT
    'mv_product_search' AS table_name,
    COUNT(*) AS row_count,
    pg_size_pretty(pg_total_relation_size('mv_product_search')) AS total_size,
    pg_size_pretty(pg_indexes_size('mv_product_search')) AS indexes_size
FROM mv_product_search;

\echo '========================================'
\echo 'Index Usage Statistics'
\echo '========================================'

SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan AS scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename IN ('benchmark_products', 'custom_posts', 'mv_product_search')
  AND idx_scan > 0
ORDER BY tablename, idx_scan DESC;

\echo '========================================'
\echo 'Benchmark Complete'
\echo '========================================'
