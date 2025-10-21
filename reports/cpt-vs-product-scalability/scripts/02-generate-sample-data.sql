-- ================================
-- Generate Sample Data for Benchmarking
-- ================================
-- This script generates realistic product data at three scales:
-- 1. 100,000 products
-- 2. 300,000 products
-- 3. 1,000,000 products (optional, for extended testing)
--
-- Data distribution:
-- - 50 suppliers
-- - 100 categories (with 2-level hierarchy)
-- - Realistic price ranges, inventory levels
-- - Varied statuses (70% active, 20% draft, 10% other)

-- ================================
-- Step 1: Generate Support Data
-- ================================

-- Generate 50 suppliers
INSERT INTO benchmark_suppliers (id, name, email, status)
SELECT
    uuid_generate_v4(),
    'Supplier ' || i,
    'supplier' || i || '@example.com',
    CASE
        WHEN RANDOM() < 0.9 THEN 'active'
        ELSE 'inactive'
    END
FROM generate_series(1, 50) AS i;

-- Generate 100 categories (80 parent + 20 child)
WITH parent_cats AS (
    INSERT INTO benchmark_categories (id, name, slug, parent_id)
    SELECT
        uuid_generate_v4(),
        'Category ' || i,
        'category-' || i,
        NULL
    FROM generate_series(1, 80) AS i
    RETURNING id, name
)
INSERT INTO benchmark_categories (id, name, slug, parent_id)
SELECT
    uuid_generate_v4(),
    p.name || ' - Sub ' || i,
    'category-' || SUBSTRING(p.id::TEXT FROM 1 FOR 8) || '-sub-' || i,
    p.id
FROM parent_cats p
CROSS JOIN generate_series(1, 20) AS i
WHERE RANDOM() < 0.25; -- Only ~25% of parent categories get subcategories

-- ================================
-- Step 2: Generate Product Data
-- ================================

-- This function generates N products for Option A (dedicated table)
CREATE OR REPLACE FUNCTION generate_benchmark_products(num_products INTEGER)
RETURNS VOID AS $$
DECLARE
    batch_size INTEGER := 10000;
    current_batch INTEGER := 0;
    remaining INTEGER := num_products;
    supplier_ids UUID[];
    category_ids UUID[];
    brands TEXT[] := ARRAY['Samsung', 'LG', 'Apple', 'Sony', 'Panasonic', 'Bosch', 'Philips', 'Generic'];
BEGIN
    -- Cache supplier and category IDs
    SELECT ARRAY_AGG(id) INTO supplier_ids FROM benchmark_suppliers WHERE status = 'active';
    SELECT ARRAY_AGG(id) INTO category_ids FROM benchmark_categories;

    RAISE NOTICE 'Starting generation of % products...', num_products;
    RAISE NOTICE 'Found % suppliers and % categories', ARRAY_LENGTH(supplier_ids, 1), ARRAY_LENGTH(category_ids, 1);

    WHILE remaining > 0 LOOP
        current_batch := LEAST(batch_size, remaining);

        INSERT INTO benchmark_products (
            id,
            name,
            description,
            short_description,
            sku,
            slug,
            type,
            status,
            is_active,
            supplier_price,
            recommended_price,
            compare_price,
            currency,
            inventory,
            low_stock_threshold,
            track_inventory,
            allow_backorder,
            supplier_id,
            category_id,
            brand,
            model,
            tags,
            features,
            images,
            variants,
            dimensions,
            shipping,
            seo,
            metadata,
            created_at,
            published_at
        )
        SELECT
            uuid_generate_v4(),
            'Product ' || (num_products - remaining + i),
            'Detailed description for product ' || (num_products - remaining + i) || '. ' ||
            'This is a high-quality product with excellent features and competitive pricing. ' ||
            'Perfect for customers looking for reliability and value.',
            'Short description for product ' || (num_products - remaining + i),
            'SKU-' || LPAD((num_products - remaining + i)::TEXT, 8, '0'),
            'product-' || LPAD((num_products - remaining + i)::TEXT, 8, '0'),
            CASE
                WHEN RANDOM() < 0.85 THEN 'physical'
                WHEN RANDOM() < 0.95 THEN 'digital'
                ELSE 'service'
            END,
            CASE
                WHEN RANDOM() < 0.70 THEN 'active'
                WHEN RANDOM() < 0.85 THEN 'draft'
                WHEN RANDOM() < 0.95 THEN 'inactive'
                ELSE 'out_of_stock'
            END,
            RANDOM() < 0.85,
            -- Pricing: supplier price 10,000-500,000 KRW
            ROUND((10000 + RANDOM() * 490000)::NUMERIC, 2),
            -- Recommended price: 1.3-2.0x supplier price
            ROUND(((10000 + RANDOM() * 490000) * (1.3 + RANDOM() * 0.7))::NUMERIC, 2),
            -- Compare price: sometimes higher for discount display
            CASE
                WHEN RANDOM() < 0.6 THEN ROUND(((10000 + RANDOM() * 490000) * (1.5 + RANDOM() * 0.8))::NUMERIC, 2)
                ELSE NULL
            END,
            'KRW',
            -- Inventory: 0-1000, with some outliers
            FLOOR(RANDOM() * 1000)::INTEGER,
            FLOOR(10 + RANDOM() * 40)::INTEGER,
            RANDOM() < 0.9,
            RANDOM() < 0.2,
            -- Random supplier and category
            supplier_ids[1 + FLOOR(RANDOM() * ARRAY_LENGTH(supplier_ids, 1))::INTEGER],
            category_ids[1 + FLOOR(RANDOM() * ARRAY_LENGTH(category_ids, 1))::INTEGER],
            -- Brand (80% have brand, 20% null)
            CASE
                WHEN RANDOM() < 0.8 THEN brands[1 + FLOOR(RANDOM() * ARRAY_LENGTH(brands, 1))::INTEGER]
                ELSE NULL
            END,
            'MODEL-' || LPAD((num_products - remaining + i)::TEXT, 6, '0'),
            -- Tags: 0-5 random tags
            ARRAY(
                SELECT 'tag-' || FLOOR(RANDOM() * 100)
                FROM generate_series(1, FLOOR(RANDOM() * 5)::INTEGER)
            ),
            -- Features: 2-6 features
            ARRAY(
                SELECT 'Feature ' || j || ': Excellent quality and performance'
                FROM generate_series(1, 2 + FLOOR(RANDOM() * 4)::INTEGER) AS j
            ),
            -- Images JSON
            jsonb_build_object(
                'main', 'https://example.com/products/' || (num_products - remaining + i) || '/main.jpg',
                'gallery', jsonb_build_array(
                    'https://example.com/products/' || (num_products - remaining + i) || '/1.jpg',
                    'https://example.com/products/' || (num_products - remaining + i) || '/2.jpg'
                )
            ),
            -- Variants (30% have variants)
            CASE
                WHEN RANDOM() < 0.3 THEN
                    jsonb_build_array(
                        jsonb_build_object('id', uuid_generate_v4(), 'name', 'Small', 'sku', 'SKU-' || (num_products - remaining + i) || '-S', 'price', 10000 + RANDOM() * 50000),
                        jsonb_build_object('id', uuid_generate_v4(), 'name', 'Medium', 'sku', 'SKU-' || (num_products - remaining + i) || '-M', 'price', 15000 + RANDOM() * 50000),
                        jsonb_build_object('id', uuid_generate_v4(), 'name', 'Large', 'sku', 'SKU-' || (num_products - remaining + i) || '-L', 'price', 20000 + RANDOM() * 50000)
                    )
                ELSE NULL
            END,
            -- Dimensions
            jsonb_build_object(
                'length', ROUND((10 + RANDOM() * 190)::NUMERIC, 2),
                'width', ROUND((10 + RANDOM() * 190)::NUMERIC, 2),
                'height', ROUND((5 + RANDOM() * 95)::NUMERIC, 2),
                'weight', ROUND((0.1 + RANDOM() * 49.9)::NUMERIC, 2),
                'unit', 'cm'
            ),
            -- Shipping
            jsonb_build_object(
                'weight', ROUND((0.1 + RANDOM() * 49.9)::NUMERIC, 2),
                'freeShipping', RANDOM() < 0.3,
                'shippingCost', CASE WHEN RANDOM() < 0.3 THEN 0 ELSE ROUND((2500 + RANDOM() * 7500)::NUMERIC, 2) END
            ),
            -- SEO
            jsonb_build_object(
                'title', 'Product ' || (num_products - remaining + i) || ' - Best Quality',
                'description', 'Buy Product ' || (num_products - remaining + i) || ' at the best price',
                'keywords', jsonb_build_array('product', 'quality', 'affordable')
            ),
            -- Metadata
            jsonb_build_object(
                'rating', ROUND((3.0 + RANDOM() * 2.0)::NUMERIC, 1),
                'reviewCount', FLOOR(RANDOM() * 500)::INTEGER,
                'viewCount', FLOOR(RANDOM() * 10000)::INTEGER
            ),
            -- Created at: last 2 years
            CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '730 days'),
            -- Published at: 80% published
            CASE
                WHEN RANDOM() < 0.8 THEN CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '365 days')
                ELSE NULL
            END
        FROM generate_series(1, current_batch) AS i;

        remaining := remaining - current_batch;
        RAISE NOTICE 'Generated % products, % remaining...', current_batch, remaining;

        -- Commit in batches to avoid long transactions
        PERFORM pg_sleep(0.1);
    END LOOP;

    RAISE NOTICE 'Successfully generated % products!', num_products;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- Step 3: Generate CustomPost equivalents
-- ================================

-- This function generates products in CustomPost format (Option B)
CREATE OR REPLACE FUNCTION generate_custompost_products(num_products INTEGER)
RETURNS VOID AS $$
DECLARE
    batch_size INTEGER := 10000;
    current_batch INTEGER := 0;
    remaining INTEGER := num_products;
    supplier_ids UUID[];
    category_ids UUID[];
    brands TEXT[] := ARRAY['Samsung', 'LG', 'Apple', 'Sony', 'Panasonic', 'Bosch', 'Philips', 'Generic'];
    cpt_id UUID;
BEGIN
    -- Get or create CPT for products
    SELECT id INTO cpt_id FROM custom_post_types WHERE slug = 'benchmark-product' LIMIT 1;
    IF cpt_id IS NULL THEN
        INSERT INTO custom_post_types (slug, name, description, active, public)
        VALUES ('benchmark-product', 'Benchmark Product', 'CPT for benchmark testing', true, true)
        RETURNING id INTO cpt_id;
    END IF;

    -- Cache supplier and category IDs
    SELECT ARRAY_AGG(id) INTO supplier_ids FROM benchmark_suppliers WHERE status = 'active';
    SELECT ARRAY_AGG(id) INTO category_ids FROM benchmark_categories;

    RAISE NOTICE 'Starting generation of % CustomPost products...', num_products;

    WHILE remaining > 0 LOOP
        current_batch := LEAST(batch_size, remaining);

        INSERT INTO custom_posts (
            id,
            "postTypeId",
            slug,
            title,
            content,
            status,
            "customFields",
            "createdAt",
            "publishedAt"
        )
        SELECT
            uuid_generate_v4(),
            cpt_id,
            'cp-product-' || LPAD((num_products - remaining + i)::TEXT, 8, '0'),
            'Product ' || (num_products - remaining + i),
            'Detailed description for product ' || (num_products - remaining + i),
            CASE
                WHEN RANDOM() < 0.70 THEN 'publish'
                ELSE 'draft'
            END,
            -- All product data in JSONB customFields
            jsonb_build_object(
                'sku', 'SKU-' || LPAD((num_products - remaining + i)::TEXT, 8, '0'),
                'type', CASE WHEN RANDOM() < 0.85 THEN 'physical' ELSE 'digital' END,
                'isActive', RANDOM() < 0.85,
                'supplierPrice', ROUND((10000 + RANDOM() * 490000)::NUMERIC, 2),
                'recommendedPrice', ROUND(((10000 + RANDOM() * 490000) * (1.3 + RANDOM() * 0.7))::NUMERIC, 2),
                'comparePrice', CASE WHEN RANDOM() < 0.6 THEN ROUND(((10000 + RANDOM() * 490000) * (1.5 + RANDOM() * 0.8))::NUMERIC, 2) ELSE NULL END,
                'currency', 'KRW',
                'inventory', FLOOR(RANDOM() * 1000)::INTEGER,
                'lowStockThreshold', FLOOR(10 + RANDOM() * 40)::INTEGER,
                'trackInventory', RANDOM() < 0.9,
                'allowBackorder', RANDOM() < 0.2,
                'supplierId', supplier_ids[1 + FLOOR(RANDOM() * ARRAY_LENGTH(supplier_ids, 1))::INTEGER],
                'categoryId', category_ids[1 + FLOOR(RANDOM() * ARRAY_LENGTH(category_ids, 1))::INTEGER],
                'brand', CASE WHEN RANDOM() < 0.8 THEN brands[1 + FLOOR(RANDOM() * ARRAY_LENGTH(brands, 1))::INTEGER] ELSE NULL END,
                'model', 'MODEL-' || LPAD((num_products - remaining + i)::TEXT, 6, '0'),
                'tags', jsonb_build_array('tag-' || FLOOR(RANDOM() * 100), 'tag-' || FLOOR(RANDOM() * 100)),
                'images', jsonb_build_object('main', 'https://example.com/products/' || (num_products - remaining + i) || '/main.jpg'),
                'dimensions', jsonb_build_object('length', ROUND((10 + RANDOM() * 190)::NUMERIC, 2), 'width', ROUND((10 + RANDOM() * 190)::NUMERIC, 2)),
                'shipping', jsonb_build_object('freeShipping', RANDOM() < 0.3, 'shippingCost', ROUND((2500 + RANDOM() * 7500)::NUMERIC, 2)),
                'metadata', jsonb_build_object('rating', ROUND((3.0 + RANDOM() * 2.0)::NUMERIC, 1), 'reviewCount', FLOOR(RANDOM() * 500)::INTEGER)
            ),
            CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '730 days'),
            CASE WHEN RANDOM() < 0.8 THEN CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '365 days') ELSE NULL END
        FROM generate_series(1, current_batch) AS i;

        remaining := remaining - current_batch;
        RAISE NOTICE 'Generated % CustomPost products, % remaining...', current_batch, remaining;
        PERFORM pg_sleep(0.1);
    END LOOP;

    RAISE NOTICE 'Successfully generated % CustomPost products!', num_products;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- Execution: Uncomment desired scale
-- ================================

-- Generate 100K products (recommended starting point)
-- SELECT generate_benchmark_products(100000);
-- SELECT generate_custompost_products(100000);

-- Generate 300K products (for mid-scale testing)
-- SELECT generate_benchmark_products(300000);
-- SELECT generate_custompost_products(300000);

-- Generate 1M products (for high-scale testing - takes significant time)
-- SELECT generate_benchmark_products(1000000);
-- SELECT generate_custompost_products(1000000);
