-- dropshipping-core install SQL

-- Create enum types
DO $$ BEGIN
  CREATE TYPE supplier_status AS ENUM ('pending', 'active', 'suspended', 'inactive');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE seller_status AS ENUM ('pending', 'active', 'suspended', 'inactive');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE product_status AS ENUM ('draft', 'active', 'discontinued', 'out_of_stock');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE offer_status AS ENUM ('pending', 'active', 'paused', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE listing_status AS ENUM ('draft', 'pending', 'active', 'paused', 'sold_out', 'deleted');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE relay_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE settlement_status AS ENUM ('open', 'closed', 'paid');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE commission_type AS ENUM ('percentage', 'fixed', 'tiered');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 1. dropshipping_suppliers
CREATE TABLE IF NOT EXISTS dropshipping_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  "businessNumber" VARCHAR(255),
  "contactEmail" VARCHAR(255),
  "contactPhone" VARCHAR(50),
  address TEXT,
  status supplier_status DEFAULT 'pending',
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. dropshipping_sellers
CREATE TABLE IF NOT EXISTS dropshipping_sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID,
  "organizationId" UUID,
  name VARCHAR(255) NOT NULL,
  "businessNumber" VARCHAR(255),
  "contactEmail" VARCHAR(255),
  "contactPhone" VARCHAR(50),
  status seller_status DEFAULT 'pending',
  "channelConfigs" JSONB,
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. dropshipping_product_masters
CREATE TABLE IF NOT EXISTS dropshipping_product_masters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(500) NOT NULL,
  description TEXT,
  sku VARCHAR(100),
  barcode VARCHAR(100),
  brand VARCHAR(100),
  category VARCHAR(100),
  status product_status DEFAULT 'draft',
  images JSONB,
  attributes JSONB,
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. dropshipping_supplier_product_offers
CREATE TABLE IF NOT EXISTS dropshipping_supplier_product_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "supplierId" UUID NOT NULL REFERENCES dropshipping_suppliers(id) ON DELETE CASCADE,
  "productMasterId" UUID NOT NULL REFERENCES dropshipping_product_masters(id) ON DELETE CASCADE,
  "supplierPrice" DECIMAL(15, 2) NOT NULL,
  "recommendedPrice" DECIMAL(15, 2),
  "minOrderQty" INT DEFAULT 1,
  "stockQty" INT DEFAULT 0,
  "leadTimeDays" INT DEFAULT 3,
  status offer_status DEFAULT 'pending',
  "validFrom" TIMESTAMP,
  "validTo" TIMESTAMP,
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. dropshipping_seller_listings
CREATE TABLE IF NOT EXISTS dropshipping_seller_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sellerId" UUID NOT NULL REFERENCES dropshipping_sellers(id) ON DELETE CASCADE,
  "offerId" UUID NOT NULL REFERENCES dropshipping_supplier_product_offers(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  "sellingPrice" DECIMAL(15, 2) NOT NULL,
  status listing_status DEFAULT 'draft',
  channel VARCHAR(50) DEFAULT 'direct',
  "externalListingId" VARCHAR(255),
  metadata JSONB,
  "publishedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. dropshipping_order_relays
CREATE TABLE IF NOT EXISTS dropshipping_order_relays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "listingId" UUID NOT NULL REFERENCES dropshipping_seller_listings(id),
  "sellerId" UUID NOT NULL REFERENCES dropshipping_sellers(id),
  "supplierId" UUID NOT NULL REFERENCES dropshipping_suppliers(id),
  "externalOrderId" VARCHAR(255),
  "buyerName" VARCHAR(255),
  "buyerPhone" VARCHAR(50),
  "buyerAddress" TEXT,
  quantity INT DEFAULT 1,
  "unitPrice" DECIMAL(15, 2) NOT NULL,
  "totalPrice" DECIMAL(15, 2) NOT NULL,
  status relay_status DEFAULT 'pending',
  "trackingNumber" VARCHAR(100),
  "shippingCarrier" VARCHAR(100),
  notes TEXT,
  metadata JSONB,
  "orderedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "shippedAt" TIMESTAMP,
  "deliveredAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. dropshipping_settlement_batches
CREATE TABLE IF NOT EXISTS dropshipping_settlement_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "batchNumber" VARCHAR(50) UNIQUE NOT NULL,
  "periodStart" TIMESTAMP NOT NULL,
  "periodEnd" TIMESTAMP NOT NULL,
  "totalSalesAmount" DECIMAL(15, 2) DEFAULT 0,
  "totalCommissionAmount" DECIMAL(15, 2) DEFAULT 0,
  "totalNetAmount" DECIMAL(15, 2) DEFAULT 0,
  status settlement_status DEFAULT 'open',
  "closedAt" TIMESTAMP,
  "paidAt" TIMESTAMP,
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. dropshipping_commission_rules
CREATE TABLE IF NOT EXISTS dropshipping_commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type commission_type DEFAULT 'percentage',
  rate DECIMAL(10, 4),
  "fixedAmount" DECIMAL(15, 2),
  "tieredRates" JSONB,
  "appliesToCategory" VARCHAR(100),
  "appliesToSupplierId" UUID,
  "appliesToSellerId" UUID,
  priority INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  "validFrom" TIMESTAMP,
  "validTo" TIMESTAMP,
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. dropshipping_commission_transactions
CREATE TABLE IF NOT EXISTS dropshipping_commission_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderRelayId" UUID NOT NULL REFERENCES dropshipping_order_relays(id),
  "settlementBatchId" UUID REFERENCES dropshipping_settlement_batches(id),
  "commissionRuleId" UUID REFERENCES dropshipping_commission_rules(id),
  "saleAmount" DECIMAL(15, 2) NOT NULL,
  "commissionAmount" DECIMAL(15, 2) NOT NULL,
  "netAmount" DECIMAL(15, 2) NOT NULL,
  "sellerId" UUID,
  "supplierId" UUID,
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ds_suppliers_status ON dropshipping_suppliers(status);
CREATE INDEX IF NOT EXISTS idx_ds_sellers_status ON dropshipping_sellers(status);
CREATE INDEX IF NOT EXISTS idx_ds_sellers_user ON dropshipping_sellers("userId");
CREATE INDEX IF NOT EXISTS idx_ds_products_status ON dropshipping_product_masters(status);
CREATE INDEX IF NOT EXISTS idx_ds_offers_supplier ON dropshipping_supplier_product_offers("supplierId");
CREATE INDEX IF NOT EXISTS idx_ds_offers_product ON dropshipping_supplier_product_offers("productMasterId");
CREATE INDEX IF NOT EXISTS idx_ds_listings_seller ON dropshipping_seller_listings("sellerId");
CREATE INDEX IF NOT EXISTS idx_ds_listings_offer ON dropshipping_seller_listings("offerId");
CREATE INDEX IF NOT EXISTS idx_ds_relays_listing ON dropshipping_order_relays("listingId");
CREATE INDEX IF NOT EXISTS idx_ds_relays_seller ON dropshipping_order_relays("sellerId");
CREATE INDEX IF NOT EXISTS idx_ds_relays_supplier ON dropshipping_order_relays("supplierId");
CREATE INDEX IF NOT EXISTS idx_ds_commission_tx_relay ON dropshipping_commission_transactions("orderRelayId");
CREATE INDEX IF NOT EXISTS idx_ds_commission_tx_batch ON dropshipping_commission_transactions("settlementBatchId");

-- Register app
INSERT INTO app_registry ("appId", name, version, type, status, "installedAt", "updatedAt")
VALUES ('dropshipping-core', 'Dropshipping Core', '1.0.0', 'core', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("appId") DO UPDATE SET status = 'active', "updatedAt" = CURRENT_TIMESTAMP;

-- Insert default commission rule
INSERT INTO dropshipping_commission_rules (id, name, description, type, rate, priority, status, "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'Default Commission Rule', 'Default 10% commission rate for all products', 'percentage', 10.00, 0, 'active', NOW(), NOW())
ON CONFLICT DO NOTHING;
