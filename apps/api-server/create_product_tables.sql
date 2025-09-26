-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    "shortDescription" TEXT,
    sku VARCHAR(100) UNIQUE NOT NULL,
    "retailPrice" DECIMAL(10,2) NOT NULL,
    "wholesalePrice" DECIMAL(10,2),
    "affiliatePrice" DECIMAL(10,2),
    "salePrice" DECIMAL(10,2),
    "onSale" BOOLEAN DEFAULT false,
    stock INTEGER DEFAULT 0,
    "lowStockThreshold" INTEGER DEFAULT 5,
    weight DECIMAL(10,3),
    dimensions JSONB,
    images TEXT[],
    gallery TEXT[],
    status VARCHAR(50) DEFAULT 'draft',
    type VARCHAR(50) DEFAULT 'physical',
    categories TEXT[],
    tags TEXT[],
    attributes JSONB,
    featured BOOLEAN DEFAULT false,
    virtual BOOLEAN DEFAULT false,
    downloadable BOOLEAN DEFAULT false,
    downloads JSONB,
    "metaTitle" VARCHAR(255),
    "metaDescription" TEXT,
    "metaKeywords" TEXT[],
    "vendorId" UUID,
    "userId" UUID,
    "orderId" UUID,
    "shippingClassId" VARCHAR(255),
    tax_status VARCHAR(50) DEFAULT 'taxable',
    tax_class VARCHAR(50),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for products
CREATE INDEX IF NOT EXISTS idx_product_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_product_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_product_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_product_vendor ON products("vendorId");
CREATE INDEX IF NOT EXISTS idx_product_created ON products("createdAt");

-- Create product_attributes table
CREATE TABLE IF NOT EXISTS product_attributes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "productId" UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    visible BOOLEAN DEFAULT true,
    variation BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create product_variations table
CREATE TABLE IF NOT EXISTS product_variations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "productId" UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) UNIQUE NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    "salePrice" DECIMAL(10,2),
    stock INTEGER DEFAULT 0,
    weight DECIMAL(10,3),
    dimensions JSONB,
    image VARCHAR(255),
    attributes JSONB,
    status VARCHAR(50) DEFAULT 'active',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create product_attribute_values table if not exists
CREATE TABLE IF NOT EXISTS product_attribute_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "attributeId" UUID NOT NULL REFERENCES product_attributes(id) ON DELETE CASCADE,
    value VARCHAR(255) NOT NULL,
    slug VARCHAR(255),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add to migration tracking table
INSERT INTO typeorm_migrations (name, timestamp)
VALUES ('CreateProductTables1758900000000', 1758900000000)
ON CONFLICT (name) DO NOTHING;