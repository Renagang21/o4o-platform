-- Quick Benchmark - Core Scenarios
\timing on

-- Get a random category for tests
\set cat_id `PGPASSWORD=o4o_password123 psql -h localhost -U o4o_user -d o4o_platform -tAc "SELECT id FROM benchmark_categories ORDER BY RANDOM() LIMIT 1"`

\echo '========================================'
\echo 'Scenario 1: SKU Lookup'
\echo '========================================'
\echo 'Option A:'
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM benchmark_products WHERE sku = 'SKU-00005000' LIMIT 1;
\echo 'Option B:'
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM custom_posts WHERE "customFields"->>'sku' = 'SKU-00005000' LIMIT 1;
\echo 'Option C:'
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM mv_product_search WHERE sku = 'SKU-00005000' LIMIT 1;

\echo '========================================'
\echo 'Scenario 2: Price Range + In-Stock'
\echo '========================================'
\echo 'Option A:'
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, name, recommended_price, inventory
FROM benchmark_products
WHERE recommended_price BETWEEN 50000 AND 150000
  AND inventory > 0 AND status = 'active' AND track_inventory = true
ORDER BY recommended_price ASC LIMIT 50;

\echo 'Option B:'
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, title, ("customFields"->>'recommendedPrice')::decimal AS price, ("customFields"->>'inventory')::integer AS inventory
FROM custom_posts
WHERE ("customFields"->>'recommendedPrice')::decimal BETWEEN 50000 AND 150000
  AND ("customFields"->>'inventory')::integer > 0 AND status = 'publish'
  AND ("customFields"->>'trackInventory')::boolean = true
ORDER BY ("customFields"->>'recommendedPrice')::decimal ASC LIMIT 50;

\echo 'Option C:'
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, name, recommended_price, inventory
FROM mv_product_search
WHERE recommended_price BETWEEN 50000 AND 150000
  AND inventory > 0 AND status = 'publish' AND track_inventory = true
ORDER BY recommended_price ASC LIMIT 50;

\echo '========================================'
\echo 'Scenario 3: Category Pagination'
\echo '========================================'
\echo 'Option A:'
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, name, recommended_price
FROM benchmark_products
WHERE category_id = :'cat_id' AND status = 'active'
ORDER BY created_at DESC LIMIT 20;

\echo 'Option B:'
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, title, ("customFields"->>'recommendedPrice')::decimal
FROM custom_posts
WHERE ("customFields"->>'categoryId')::uuid = :'cat_id' AND status = 'publish'
ORDER BY "createdAt" DESC LIMIT 20;

\echo 'Option C:'
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, name, recommended_price
FROM mv_product_search
WHERE category_id = :'cat_id' AND status = 'publish'
ORDER BY created_at DESC LIMIT 20;

\echo '========================================'
\echo 'Table Sizes'
\echo '========================================'
SELECT 'benchmark_products' AS table_name,
       COUNT(*) AS rows,
       pg_size_pretty(pg_total_relation_size('benchmark_products')) AS total_size,
       pg_size_pretty(pg_relation_size('benchmark_products')) AS table_size,
       pg_size_pretty(pg_indexes_size('benchmark_products')) AS indexes_size
FROM benchmark_products
UNION ALL
SELECT 'custom_posts', COUNT(*),
       pg_size_pretty(pg_total_relation_size('custom_posts')),
       pg_size_pretty(pg_relation_size('custom_posts')),
       pg_size_pretty(pg_indexes_size('custom_posts'))
FROM custom_posts
WHERE "postTypeId" IN (SELECT id FROM custom_post_types WHERE slug = 'benchmark-product')
UNION ALL
SELECT 'mv_product_search', COUNT(*),
       pg_size_pretty(pg_total_relation_size('mv_product_search')),
       pg_size_pretty(pg_relation_size('mv_product_search')),
       pg_size_pretty(pg_indexes_size('mv_product_search'))
FROM mv_product_search;
