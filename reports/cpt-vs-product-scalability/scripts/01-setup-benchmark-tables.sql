-- ================================
-- Benchmark Setup: Product Schema Options
-- ================================
-- This script creates three different product storage approaches:
-- A) Dedicated Product table (normalized columns with multiple indexes)
-- B) CustomPost table (JSONB fields - current implementation)
-- C) Materialized View for search optimization

-- ================================
-- Option A: Dedicated Product Table
-- ================================

CREATE TABLE IF NOT EXISTS benchmark_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Basic Information
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    short_description TEXT,
    sku VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,

    -- Product Type and Status
    type VARCHAR(50) DEFAULT 'physical', -- physical, digital, service
    status VARCHAR(50) DEFAULT 'draft', -- draft, active, inactive, out_of_stock
    is_active BOOLEAN DEFAULT true,

    -- Pricing (all in decimal for precision)
    supplier_price DECIMAL(10,2) NOT NULL,
    recommended_price DECIMAL(10,2) NOT NULL,
    compare_price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'KRW',

    -- Inventory
    inventory INTEGER DEFAULT 0,
    low_stock_threshold INTEGER,
    track_inventory BOOLEAN DEFAULT true,
    allow_backorder BOOLEAN DEFAULT false,

    -- Relationships (foreign keys)
    supplier_id UUID NOT NULL,
    category_id UUID,

    -- Additional JSON fields for flexibility
    images JSONB,
    variants JSONB,
    dimensions JSONB,
    shipping JSONB,
    seo JSONB,
    metadata JSONB,

    -- Searchable text fields
    brand VARCHAR(100),
    model VARCHAR(100),
    tags TEXT[],
    features TEXT[],

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP
);

-- Indexes for Option A (8 indexes as mentioned in hypothesis)
CREATE INDEX idx_products_supplier_status ON benchmark_products(supplier_id, status);
CREATE INDEX idx_products_category_status ON benchmark_products(category_id, status);
CREATE INDEX idx_products_status_created ON benchmark_products(status, created_at);
CREATE INDEX idx_products_price ON benchmark_products(recommended_price);
CREATE INDEX idx_products_inventory ON benchmark_products(inventory) WHERE track_inventory = true;
CREATE INDEX idx_products_brand ON benchmark_products(brand);
CREATE INDEX idx_products_tags ON benchmark_products USING GIN(tags);
CREATE INDEX idx_products_search_text ON benchmark_products USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(brand, '')));

-- ================================
-- Option B: CustomPost Table (Current Implementation)
-- ================================
-- Using existing custom_posts table structure
-- We'll add JSONB indexes in a separate step

-- ================================
-- Option C: Materialized View (for search optimization)
-- ================================

-- This will be created after we populate data
-- Deferred to: 03-create-materialized-views.sql

-- ================================
-- Support Tables (for realistic foreign keys)
-- ================================

CREATE TABLE IF NOT EXISTS benchmark_suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS benchmark_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    parent_id UUID REFERENCES benchmark_categories(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================
-- Helper Functions
-- ================================

-- Function to generate random SKU
CREATE OR REPLACE FUNCTION generate_sku(prefix TEXT DEFAULT 'PRD')
RETURNS TEXT AS $$
BEGIN
    RETURN prefix || '-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate random slug from name
CREATE OR REPLACE FUNCTION generate_product_slug(product_name TEXT, id UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(
        REGEXP_REPLACE(
            product_name || '-' || SUBSTRING(id::TEXT FROM 1 FOR 8),
            '[^a-z0-9\-]',
            '-',
            'g'
        )
    );
END;
$$ LANGUAGE plpgsql;

-- ================================
-- Cleanup (for re-runs)
-- ================================

COMMENT ON TABLE benchmark_products IS 'Option A: Dedicated normalized product table with 8 indexes';
COMMENT ON TABLE benchmark_suppliers IS 'Support table for product benchmarks';
COMMENT ON TABLE benchmark_categories IS 'Support table for product benchmarks';
