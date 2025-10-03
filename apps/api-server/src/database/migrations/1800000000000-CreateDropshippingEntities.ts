import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDropshippingEntities1800000000000 implements MigrationInterface {
    name = 'CreateDropshippingEntities1800000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create products table
        await queryRunner.query(`
            CREATE TABLE "products" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" varchar(255) NOT NULL,
                "description" text,
                "shortDescription" varchar(500),
                "sku" varchar(100) NOT NULL,
                "barcode" varchar(100),
                "weight" decimal(8,2),
                "dimensions" json,
                "category" varchar(100),
                "tags" text,
                "images" json,
                "thumbnailImage" varchar(500),
                "status" character varying NOT NULL DEFAULT 'draft',
                "isActive" boolean NOT NULL DEFAULT true,
                "isDigital" boolean NOT NULL DEFAULT false,
                "price" decimal(10,2) NOT NULL DEFAULT 0,
                "comparePrice" decimal(10,2),
                "costPrice" decimal(10,2) NOT NULL DEFAULT 0,
                "inventory" integer NOT NULL DEFAULT 0,
                "lowStockThreshold" integer DEFAULT 10,
                "trackInventory" boolean NOT NULL DEFAULT true,
                "allowBackorders" boolean NOT NULL DEFAULT false,
                "requiresShipping" boolean NOT NULL DEFAULT true,
                "shippingClass" varchar(100),
                "taxClass" varchar(100),
                "isTaxable" boolean NOT NULL DEFAULT true,
                "specifications" json,
                "variants" json,
                "seoTitle" varchar(255),
                "seoDescription" text,
                "seoKeywords" text,
                "slug" varchar(255),
                "customUrl" varchar(255),
                "metaData" json,
                "featuredUntil" timestamp,
                "publishedAt" timestamp,
                "viewCount" integer NOT NULL DEFAULT 0,
                "salesCount" integer NOT NULL DEFAULT 0,
                "averageRating" decimal(3,2) NOT NULL DEFAULT 0,
                "reviewCount" integer NOT NULL DEFAULT 0,
                "supplierId" uuid NOT NULL,
                "tierPricing" json,
                "partnerCommissionRate" decimal(5,2) NOT NULL DEFAULT 5,
                "minimumOrderQuantity" integer NOT NULL DEFAULT 1,
                "maximumOrderQuantity" integer,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_products_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_products_sku" UNIQUE ("sku")
            )
        `);

        // Create indexes for products
        await queryRunner.query(`CREATE INDEX "IDX_products_supplierId" ON "products" ("supplierId")`);
        await queryRunner.query(`CREATE INDEX "IDX_products_status" ON "products" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_products_category" ON "products" ("category")`);
        await queryRunner.query(`CREATE INDEX "IDX_products_price" ON "products" ("price")`);
        await queryRunner.query(`CREATE INDEX "IDX_products_inventory" ON "products" ("inventory")`);
        await queryRunner.query(`CREATE INDEX "IDX_products_isActive_status" ON "products" ("isActive", "status")`);
        await queryRunner.query(`CREATE INDEX "IDX_products_slug" ON "products" ("slug")`);
        await queryRunner.query(`CREATE INDEX "IDX_products_publishedAt" ON "products" ("publishedAt")`);

        // Create suppliers table
        await queryRunner.query(`
            CREATE TABLE "suppliers" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "businessInfoId" uuid NOT NULL,
                "supplierCode" varchar(50) NOT NULL,
                "status" character varying NOT NULL DEFAULT 'pending',
                "tier" character varying NOT NULL DEFAULT 'standard',
                "isActive" boolean NOT NULL DEFAULT true,
                "businessType" varchar(100),
                "businessRegistrationNumber" varchar(100),
                "taxId" varchar(100),
                "specializations" text,
                "serviceAreas" text,
                "qualityCertifications" text,
                "minimumOrderValue" decimal(10,2) NOT NULL DEFAULT 0,
                "leadTimeDays" integer NOT NULL DEFAULT 7,
                "shippingMethods" text,
                "returnPolicy" text,
                "warrantyTerms" text,
                "paymentTerms" text,
                "creditLimit" decimal(12,2) NOT NULL DEFAULT 0,
                "discountTiers" json,
                "totalProducts" integer NOT NULL DEFAULT 0,
                "totalOrders" integer NOT NULL DEFAULT 0,
                "totalRevenue" decimal(12,2) NOT NULL DEFAULT 0,
                "averageRating" decimal(3,2) NOT NULL DEFAULT 0,
                "reviewCount" integer NOT NULL DEFAULT 0,
                "fulfillmentSuccessRate" decimal(5,2) NOT NULL DEFAULT 0,
                "averageShippingTime" decimal(5,2) NOT NULL DEFAULT 0,
                "onTimeDeliveryRate" decimal(5,2) NOT NULL DEFAULT 0,
                "defectRate" decimal(5,2) NOT NULL DEFAULT 0,
                "returnRate" decimal(5,2) NOT NULL DEFAULT 0,
                "apiKey" varchar(255),
                "webhookUrl" varchar(500),
                "preferredLanguage" varchar(10),
                "timezone" varchar(50),
                "metadata" json,
                "suspensionReason" text,
                "lastOrderAt" timestamp,
                "lastLoginAt" timestamp,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "approvedAt" timestamp,
                "approvedBy" uuid,
                CONSTRAINT "PK_suppliers_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_suppliers_userId" UNIQUE ("userId"),
                CONSTRAINT "UQ_suppliers_businessInfoId" UNIQUE ("businessInfoId"),
                CONSTRAINT "UQ_suppliers_supplierCode" UNIQUE ("supplierCode")
            )
        `);

        // Create indexes for suppliers
        await queryRunner.query(`CREATE INDEX "IDX_suppliers_status" ON "suppliers" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_suppliers_tier" ON "suppliers" ("tier")`);
        await queryRunner.query(`CREATE INDEX "IDX_suppliers_isActive_status" ON "suppliers" ("isActive", "status")`);
        await queryRunner.query(`CREATE INDEX "IDX_suppliers_businessType" ON "suppliers" ("businessType")`);

        // Create sellers table
        await queryRunner.query(`
            CREATE TABLE "sellers" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "businessInfoId" uuid NOT NULL,
                "sellerCode" varchar(50) NOT NULL,
                "status" character varying NOT NULL DEFAULT 'pending',
                "tier" character varying NOT NULL DEFAULT 'bronze',
                "isActive" boolean NOT NULL DEFAULT true,
                "storeName" varchar(255) NOT NULL,
                "storeDescription" text,
                "storeUrl" varchar(255),
                "storeLogo" varchar(500),
                "storeBanner" varchar(500),
                "storeTheme" json,
                "businessType" varchar(100),
                "businessRegistrationNumber" varchar(100),
                "taxId" varchar(100),
                "shippingPolicies" json,
                "returnPolicies" json,
                "customerServicePolicies" json,
                "totalProducts" integer NOT NULL DEFAULT 0,
                "activeProducts" integer NOT NULL DEFAULT 0,
                "totalOrders" integer NOT NULL DEFAULT 0,
                "totalRevenue" decimal(12,2) NOT NULL DEFAULT 0,
                "totalProfit" decimal(12,2) NOT NULL DEFAULT 0,
                "averageOrderValue" decimal(10,2) NOT NULL DEFAULT 0,
                "conversionRate" decimal(5,2) NOT NULL DEFAULT 0,
                "averageRating" decimal(3,2) NOT NULL DEFAULT 0,
                "reviewCount" integer NOT NULL DEFAULT 0,
                "fulfillmentRate" decimal(5,2) NOT NULL DEFAULT 0,
                "averageShippingTime" decimal(5,2) NOT NULL DEFAULT 0,
                "customerSatisfactionRate" decimal(5,2) NOT NULL DEFAULT 0,
                "returnRate" decimal(5,2) NOT NULL DEFAULT 0,
                "preferredPaymentMethod" varchar(100),
                "payoutSchedule" varchar(50) NOT NULL DEFAULT 'weekly',
                "commissionRate" decimal(5,2) NOT NULL DEFAULT 2.5,
                "preferredLanguage" varchar(10),
                "timezone" varchar(50),
                "autoOrderProcessing" boolean NOT NULL DEFAULT false,
                "emailNotifications" boolean NOT NULL DEFAULT true,
                "smsNotifications" boolean NOT NULL DEFAULT false,
                "metadata" json,
                "suspensionReason" text,
                "lastOrderAt" timestamp,
                "lastLoginAt" timestamp,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "approvedAt" timestamp,
                "approvedBy" uuid,
                CONSTRAINT "PK_sellers_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_sellers_userId" UNIQUE ("userId"),
                CONSTRAINT "UQ_sellers_businessInfoId" UNIQUE ("businessInfoId"),
                CONSTRAINT "UQ_sellers_sellerCode" UNIQUE ("sellerCode"),
                CONSTRAINT "UQ_sellers_storeUrl" UNIQUE ("storeUrl")
            )
        `);

        // Create indexes for sellers
        await queryRunner.query(`CREATE INDEX "IDX_sellers_status" ON "sellers" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_sellers_tier" ON "sellers" ("tier")`);
        await queryRunner.query(`CREATE INDEX "IDX_sellers_isActive_status" ON "sellers" ("isActive", "status")`);
        await queryRunner.query(`CREATE INDEX "IDX_sellers_businessType" ON "sellers" ("businessType")`);
        await queryRunner.query(`CREATE INDEX "IDX_sellers_storeName" ON "sellers" ("storeName")`);

        // Create partners table
        await queryRunner.query(`
            CREATE TABLE "partners" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "sellerId" uuid NOT NULL,
                "status" character varying NOT NULL DEFAULT 'pending',
                "tier" character varying NOT NULL DEFAULT 'bronze',
                "isActive" boolean NOT NULL DEFAULT true,
                "referralCode" varchar(20) NOT NULL,
                "referralLink" varchar(500) NOT NULL,
                "profile" json,
                "metrics" json,
                "totalEarnings" decimal(12,2) NOT NULL DEFAULT 0,
                "availableBalance" decimal(12,2) NOT NULL DEFAULT 0,
                "pendingBalance" decimal(12,2) NOT NULL DEFAULT 0,
                "paidOut" decimal(12,2) NOT NULL DEFAULT 0,
                "payoutInfo" json,
                "minimumPayout" decimal(10,2) NOT NULL DEFAULT 50000,
                "totalClicks" integer NOT NULL DEFAULT 0,
                "totalOrders" integer NOT NULL DEFAULT 0,
                "conversionRate" decimal(5,2) NOT NULL DEFAULT 0,
                "averageOrderValue" decimal(10,2) NOT NULL DEFAULT 0,
                "monthlyClicks" integer NOT NULL DEFAULT 0,
                "monthlyOrders" integer NOT NULL DEFAULT 0,
                "monthlyEarnings" decimal(12,2) NOT NULL DEFAULT 0,
                "applicationMessage" text,
                "rejectionReason" text,
                "allowedPromotionTypes" text,
                "canUseProductImages" boolean NOT NULL DEFAULT true,
                "canCreateCoupons" boolean NOT NULL DEFAULT true,
                "emailNotifications" boolean NOT NULL DEFAULT true,
                "smsNotifications" boolean NOT NULL DEFAULT true,
                "preferredLanguage" varchar(10),
                "metadata" json,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "approvedAt" timestamp,
                "approvedBy" uuid,
                "lastActiveAt" timestamp,
                "lastPayoutAt" timestamp,
                CONSTRAINT "PK_partners_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_partners_userId" UNIQUE ("userId"),
                CONSTRAINT "UQ_partners_referralCode" UNIQUE ("referralCode")
            )
        `);

        // Create indexes for partners
        await queryRunner.query(`CREATE INDEX "IDX_partners_sellerId_status" ON "partners" ("sellerId", "status")`);
        await queryRunner.query(`CREATE INDEX "IDX_partners_status_tier" ON "partners" ("status", "tier")`);
        await queryRunner.query(`CREATE INDEX "IDX_partners_isActive_status" ON "partners" ("isActive", "status")`);

        // Create seller_products table
        await queryRunner.query(`
            CREATE TABLE "seller_products" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "sellerId" uuid NOT NULL,
                "productId" uuid NOT NULL,
                "sellerPrice" decimal(10,2) NOT NULL,
                "comparePrice" decimal(10,2),
                "costPrice" decimal(10,2) NOT NULL,
                "profit" decimal(10,2) NOT NULL,
                "profitMargin" decimal(5,2) NOT NULL,
                "status" character varying NOT NULL DEFAULT 'active',
                "isActive" boolean NOT NULL DEFAULT true,
                "isVisible" boolean NOT NULL DEFAULT true,
                "sellerInventory" integer,
                "reservedInventory" integer,
                "totalSold" integer NOT NULL DEFAULT 0,
                "totalRevenue" decimal(12,2) NOT NULL DEFAULT 0,
                "viewCount" integer NOT NULL DEFAULT 0,
                "cartAddCount" integer NOT NULL DEFAULT 0,
                "sellerSku" varchar(255),
                "sellerDescription" text,
                "sellerTags" text,
                "sellerImages" json,
                "isFeatured" boolean NOT NULL DEFAULT false,
                "featuredUntil" timestamp,
                "discountRate" decimal(5,2),
                "saleStartDate" timestamp,
                "saleEndDate" timestamp,
                "sellerSlug" varchar(255),
                "seoMetadata" json,
                "conversionRate" decimal(5,2) NOT NULL DEFAULT 0,
                "averageOrderValue" decimal(10,2) NOT NULL DEFAULT 0,
                "averageRating" decimal(3,2) NOT NULL DEFAULT 0,
                "reviewCount" integer NOT NULL DEFAULT 0,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "publishedAt" timestamp,
                "lastSoldAt" timestamp,
                CONSTRAINT "PK_seller_products_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_seller_products_sellerId_productId" UNIQUE ("sellerId", "productId")
            )
        `);

        // Create indexes for seller_products
        await queryRunner.query(`CREATE INDEX "IDX_seller_products_sellerId_status" ON "seller_products" ("sellerId", "status")`);
        await queryRunner.query(`CREATE INDEX "IDX_seller_products_productId_status" ON "seller_products" ("productId", "status")`);
        await queryRunner.query(`CREATE INDEX "IDX_seller_products_status_isActive" ON "seller_products" ("status", "isActive")`);
        await queryRunner.query(`CREATE INDEX "IDX_seller_products_sellerPrice_status" ON "seller_products" ("sellerPrice", "status")`);

        // Create partner_commissions table
        await queryRunner.query(`
            CREATE TABLE "partner_commissions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "partnerId" uuid NOT NULL,
                "orderId" uuid NOT NULL,
                "productId" uuid NOT NULL,
                "sellerId" uuid NOT NULL,
                "commissionType" character varying NOT NULL DEFAULT 'sale',
                "status" character varying NOT NULL DEFAULT 'pending',
                "orderAmount" decimal(10,2) NOT NULL,
                "productPrice" decimal(10,2) NOT NULL,
                "quantity" integer NOT NULL,
                "commissionRate" decimal(5,2) NOT NULL,
                "commissionAmount" decimal(10,2) NOT NULL,
                "currency" varchar(3) NOT NULL DEFAULT 'KRW',
                "referralCode" varchar(20) NOT NULL,
                "referralSource" text,
                "campaign" varchar(100),
                "trackingData" json,
                "clickedAt" timestamp,
                "convertedAt" timestamp,
                "conversionTimeMinutes" integer,
                "confirmedAt" timestamp,
                "paidAt" timestamp,
                "payoutBatchId" uuid,
                "paymentReference" text,
                "notes" text,
                "cancellationReason" text,
                "metadata" json,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_partner_commissions_id" PRIMARY KEY ("id")
            )
        `);

        // Create indexes for partner_commissions
        await queryRunner.query(`CREATE INDEX "IDX_partner_commissions_partnerId_status" ON "partner_commissions" ("partnerId", "status")`);
        await queryRunner.query(`CREATE INDEX "IDX_partner_commissions_orderId" ON "partner_commissions" ("orderId")`);
        await queryRunner.query(`CREATE INDEX "IDX_partner_commissions_sellerId_status" ON "partner_commissions" ("sellerId", "status")`);
        await queryRunner.query(`CREATE INDEX "IDX_partner_commissions_status_createdAt" ON "partner_commissions" ("status", "createdAt")`);
        await queryRunner.query(`CREATE INDEX "IDX_partner_commissions_commissionType_status" ON "partner_commissions" ("commissionType", "status")`);

        // Add foreign key constraints
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_products_supplierId" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE`);
        await queryRunner.query(`ALTER TABLE "suppliers" ADD CONSTRAINT "FK_suppliers_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`);
        await queryRunner.query(`ALTER TABLE "sellers" ADD CONSTRAINT "FK_sellers_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`);
        await queryRunner.query(`ALTER TABLE "partners" ADD CONSTRAINT "FK_partners_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`);
        await queryRunner.query(`ALTER TABLE "partners" ADD CONSTRAINT "FK_partners_sellerId" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE CASCADE`);
        await queryRunner.query(`ALTER TABLE "seller_products" ADD CONSTRAINT "FK_seller_products_sellerId" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE CASCADE`);
        await queryRunner.query(`ALTER TABLE "seller_products" ADD CONSTRAINT "FK_seller_products_productId" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE`);
        await queryRunner.query(`ALTER TABLE "partner_commissions" ADD CONSTRAINT "FK_partner_commissions_partnerId" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE`);
        await queryRunner.query(`ALTER TABLE "partner_commissions" ADD CONSTRAINT "FK_partner_commissions_orderId" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE`);
        await queryRunner.query(`ALTER TABLE "partner_commissions" ADD CONSTRAINT "FK_partner_commissions_productId" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE`);
        await queryRunner.query(`ALTER TABLE "partner_commissions" ADD CONSTRAINT "FK_partner_commissions_sellerId" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE CASCADE`);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "partner_commissions" DROP CONSTRAINT "FK_partner_commissions_sellerId"`);
        await queryRunner.query(`ALTER TABLE "partner_commissions" DROP CONSTRAINT "FK_partner_commissions_productId"`);
        await queryRunner.query(`ALTER TABLE "partner_commissions" DROP CONSTRAINT "FK_partner_commissions_orderId"`);
        await queryRunner.query(`ALTER TABLE "partner_commissions" DROP CONSTRAINT "FK_partner_commissions_partnerId"`);
        await queryRunner.query(`ALTER TABLE "seller_products" DROP CONSTRAINT "FK_seller_products_productId"`);
        await queryRunner.query(`ALTER TABLE "seller_products" DROP CONSTRAINT "FK_seller_products_sellerId"`);
        await queryRunner.query(`ALTER TABLE "partners" DROP CONSTRAINT "FK_partners_sellerId"`);
        await queryRunner.query(`ALTER TABLE "partners" DROP CONSTRAINT "FK_partners_userId"`);
        await queryRunner.query(`ALTER TABLE "sellers" DROP CONSTRAINT "FK_sellers_userId"`);
        await queryRunner.query(`ALTER TABLE "suppliers" DROP CONSTRAINT "FK_suppliers_userId"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_products_supplierId"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE "partner_commissions"`);
        await queryRunner.query(`DROP TABLE "seller_products"`);
        await queryRunner.query(`DROP TABLE "partners"`);
        await queryRunner.query(`DROP TABLE "sellers"`);
        await queryRunner.query(`DROP TABLE "suppliers"`);
        await queryRunner.query(`DROP TABLE "products"`);
    }
}