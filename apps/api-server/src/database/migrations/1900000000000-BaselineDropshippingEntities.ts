import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline Migration for Dropshipping Entities
 *
 * This migration ensures all dropshipping entity tables exist with the correct schema.
 * It uses CREATE TABLE IF NOT EXISTS to be idempotent and safe to run multiple times.
 *
 * Created: 2025-11-03
 * Purpose: Fix migration state mismatch from 1800000000000-CreateDropshippingEntities
 */
export class BaselineDropshippingEntities1900000000000 implements MigrationInterface {
    name = 'BaselineDropshippingEntities1900000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create suppliers table (if not exists)
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "suppliers" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "businessInfoId" uuid,
                "status" character varying NOT NULL DEFAULT 'pending',
                "tier" character varying NOT NULL DEFAULT 'basic',
                "isActive" boolean NOT NULL DEFAULT true,
                "companyDescription" text,
                "specialties" text,
                "certifications" text,
                "website" varchar(255),
                "sellerTierDiscounts" json,
                "supplierPolicy" json,
                "defaultPartnerCommissionRate" decimal(5,2) NOT NULL DEFAULT 5.0,
                "defaultPartnerCommissionAmount" decimal(10,2),
                "taxId" varchar(50),
                "bankName" varchar(100),
                "bankAccount" varchar(50),
                "accountHolder" varchar(100),
                "metrics" json,
                "averageRating" decimal(3,2) NOT NULL DEFAULT 0,
                "totalReviews" integer NOT NULL DEFAULT 0,
                "contactPerson" varchar(100),
                "contactPhone" varchar(20),
                "contactEmail" varchar(255),
                "operatingHours" text,
                "timezone" varchar(10),
                "shippingMethods" text,
                "paymentMethods" text,
                "foundedYear" integer,
                "employeeCount" integer,
                "socialMedia" json,
                "metadata" json,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "approvedAt" timestamp,
                "approvedBy" uuid,
                CONSTRAINT "PK_suppliers_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_suppliers_userId" UNIQUE ("userId")
            )
        `);

        // 2. Create sellers table (if not exists)
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "sellers" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "businessInfoId" uuid,
                "status" character varying NOT NULL DEFAULT 'pending',
                "tier" character varying NOT NULL DEFAULT 'bronze',
                "isActive" boolean NOT NULL DEFAULT true,
                "branding" json NOT NULL,
                "storeSlug" varchar(255) NOT NULL,
                "policies" json,
                "metrics" json,
                "averageRating" decimal(3,2) NOT NULL DEFAULT 0,
                "totalReviews" integer NOT NULL DEFAULT 0,
                "totalRevenue" decimal(12,2) NOT NULL DEFAULT 0,
                "monthlyRevenue" decimal(12,2) NOT NULL DEFAULT 0,
                "platformCommissionRate" decimal(5,2) NOT NULL DEFAULT 2.5,
                "productCount" integer NOT NULL DEFAULT 0,
                "activeProductCount" integer NOT NULL DEFAULT 0,
                "responseTime" decimal(4,1),
                "customerSatisfactionRate" decimal(5,2) NOT NULL DEFAULT 0,
                "operatingHours" text,
                "timezone" varchar(10),
                "shippingMethods" text,
                "paymentMethods" text,
                "featuredSeller" boolean NOT NULL DEFAULT false,
                "featuredUntil" timestamp,
                "specialOffers" text,
                "socialMedia" json,
                "marketingDescription" text,
                "allowPartners" boolean NOT NULL DEFAULT true,
                "partnerInviteMessage" text,
                "partnerRequirements" text,
                "metadata" json,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "approvedAt" timestamp,
                "approvedBy" uuid,
                "lastActiveAt" timestamp,
                CONSTRAINT "PK_sellers_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_sellers_userId" UNIQUE ("userId"),
                CONSTRAINT "UQ_sellers_storeSlug" UNIQUE ("storeSlug")
            )
        `);

        // 3. Create partners table (if not exists)
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "partners" (
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

        // 4. Create partner_commissions table (if not exists)
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "partner_commissions" (
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

        // 5. Create indexes (if not exist)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_suppliers_userId" ON "suppliers" ("userId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_suppliers_status_tier" ON "suppliers" ("status", "tier")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_suppliers_isActive_status" ON "suppliers" ("isActive", "status")`);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_sellers_userId" ON "sellers" ("userId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_sellers_status_tier" ON "sellers" ("status", "tier")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_sellers_isActive_status" ON "sellers" ("isActive", "status")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_sellers_tier_averageRating" ON "sellers" ("tier", "averageRating")`);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_partners_sellerId_status" ON "partners" ("sellerId", "status")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_partners_status_tier" ON "partners" ("status", "tier")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_partners_isActive_status" ON "partners" ("isActive", "status")`);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_partner_commissions_partnerId_status" ON "partner_commissions" ("partnerId", "status")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_partner_commissions_sellerId_status" ON "partner_commissions" ("sellerId", "status")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_partner_commissions_orderId" ON "partner_commissions" ("orderId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_partner_commissions_status_createdAt" ON "partner_commissions" ("status", "createdAt")`);

        // 6. Add foreign keys (if not exist) - Check existence first to avoid errors
        // FK: suppliers -> users
        const supplierUserFKExists = await queryRunner.query(`
            SELECT 1 FROM pg_constraint WHERE conname = 'FK_suppliers_userId'
        `);
        if (supplierUserFKExists.length === 0) {
            await queryRunner.query(`
                ALTER TABLE "suppliers"
                ADD CONSTRAINT "FK_suppliers_userId"
                FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
            `);
        }

        // FK: sellers -> users
        const sellerUserFKExists = await queryRunner.query(`
            SELECT 1 FROM pg_constraint WHERE conname = 'FK_sellers_userId'
        `);
        if (sellerUserFKExists.length === 0) {
            await queryRunner.query(`
                ALTER TABLE "sellers"
                ADD CONSTRAINT "FK_sellers_userId"
                FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
            `);
        }

        // FK: partners -> users
        const partnerUserFKExists = await queryRunner.query(`
            SELECT 1 FROM pg_constraint WHERE conname = 'FK_partners_userId'
        `);
        if (partnerUserFKExists.length === 0) {
            await queryRunner.query(`
                ALTER TABLE "partners"
                ADD CONSTRAINT "FK_partners_userId"
                FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
            `);
        }

        // FK: partners -> sellers
        const partnerSellerFKExists = await queryRunner.query(`
            SELECT 1 FROM pg_constraint WHERE conname = 'FK_partners_sellerId'
        `);
        if (partnerSellerFKExists.length === 0) {
            await queryRunner.query(`
                ALTER TABLE "partners"
                ADD CONSTRAINT "FK_partners_sellerId"
                FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE CASCADE
            `);
        }

        // FK: partner_commissions -> partners
        const commissionPartnerFKExists = await queryRunner.query(`
            SELECT 1 FROM pg_constraint WHERE conname = 'FK_partner_commissions_partnerId'
        `);
        if (commissionPartnerFKExists.length === 0) {
            await queryRunner.query(`
                ALTER TABLE "partner_commissions"
                ADD CONSTRAINT "FK_partner_commissions_partnerId"
                FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE
            `);
        }

        // Note: FK to orders and products are omitted as those tables may not exist yet
        // They will be added in future migrations when those tables are available
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Rollback: Drop foreign keys
        await queryRunner.query(`ALTER TABLE "partner_commissions" DROP CONSTRAINT IF EXISTS "FK_partner_commissions_partnerId"`);
        await queryRunner.query(`ALTER TABLE "partners" DROP CONSTRAINT IF EXISTS "FK_partners_sellerId"`);
        await queryRunner.query(`ALTER TABLE "partners" DROP CONSTRAINT IF EXISTS "FK_partners_userId"`);
        await queryRunner.query(`ALTER TABLE "sellers" DROP CONSTRAINT IF EXISTS "FK_sellers_userId"`);
        await queryRunner.query(`ALTER TABLE "suppliers" DROP CONSTRAINT IF EXISTS "FK_suppliers_userId"`);

        // Rollback: Drop tables
        await queryRunner.query(`DROP TABLE IF EXISTS "partner_commissions"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "partners"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "sellers"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "suppliers"`);
    }
}
