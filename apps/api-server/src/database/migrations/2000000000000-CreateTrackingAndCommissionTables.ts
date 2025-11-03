import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 2.1 Migration: Tracking & Commission Automation Tables
 *
 * Creates tables for:
 * - referral_clicks: Click tracking with bot/duplicate filtering
 * - conversion_events: Conversion tracking with attribution
 * - commission_policies: Commission calculation rules
 *
 * All tables use CREATE TABLE IF NOT EXISTS for idempotency.
 */
export class CreateTrackingAndCommissionTables2000000000000 implements MigrationInterface {
    name = 'CreateTrackingAndCommissionTables2000000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create referral_clicks table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "referral_clicks" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "partnerId" uuid NOT NULL,
                "productId" uuid,
                "referralCode" varchar(20) NOT NULL,
                "referralLink" text,
                "campaign" varchar(100),
                "medium" varchar(100),
                "source" varchar(100),
                "status" character varying NOT NULL DEFAULT 'valid',
                "clickSource" character varying NOT NULL DEFAULT 'unknown',
                "sessionId" varchar(64),
                "fingerprint" varchar(64),
                "ipAddress" inet,
                "userAgent" varchar(500),
                "referer" varchar(500),
                "country" varchar(2),
                "city" varchar(100),
                "deviceType" varchar(50),
                "osName" varchar(50),
                "browserName" varchar(50),
                "isDuplicate" boolean NOT NULL DEFAULT false,
                "originalClickId" uuid,
                "clickCount" integer NOT NULL DEFAULT 1,
                "isSuspiciousBot" boolean NOT NULL DEFAULT false,
                "botDetectionReason" text,
                "isRateLimited" boolean NOT NULL DEFAULT false,
                "hasConverted" boolean NOT NULL DEFAULT false,
                "conversionId" uuid,
                "convertedAt" timestamp,
                "metadata" json,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "anonymizedAt" timestamp,
                CONSTRAINT "PK_referral_clicks_id" PRIMARY KEY ("id")
            )
        `);

        // 2. Create indexes for referral_clicks
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_referral_clicks_partnerId_createdAt" ON "referral_clicks" ("partnerId", "createdAt")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_referral_clicks_referralCode_createdAt" ON "referral_clicks" ("referralCode", "createdAt")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_referral_clicks_status_createdAt" ON "referral_clicks" ("status", "createdAt")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_referral_clicks_sessionId" ON "referral_clicks" ("sessionId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_referral_clicks_fingerprint" ON "referral_clicks" ("fingerprint")`);

        // 3. Create conversion_events table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "conversion_events" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "partnerId" uuid NOT NULL,
                "orderId" uuid NOT NULL,
                "productId" uuid NOT NULL,
                "referralClickId" uuid NOT NULL,
                "referralCode" varchar(20) NOT NULL,
                "conversionType" character varying NOT NULL DEFAULT 'direct_purchase',
                "attributionModel" character varying NOT NULL DEFAULT 'last_touch',
                "status" character varying NOT NULL DEFAULT 'pending',
                "orderAmount" decimal(10,2) NOT NULL,
                "productPrice" decimal(10,2) NOT NULL,
                "quantity" integer NOT NULL DEFAULT 1,
                "currency" varchar(3) NOT NULL DEFAULT 'KRW',
                "refundedAmount" decimal(10,2) NOT NULL DEFAULT 0,
                "refundedQuantity" integer NOT NULL DEFAULT 0,
                "attributionWeight" decimal(5,4) NOT NULL DEFAULT 1.0,
                "attributionPath" json,
                "clickedAt" timestamp NOT NULL,
                "convertedAt" timestamp NOT NULL,
                "conversionTimeMinutes" integer NOT NULL,
                "attributionWindowDays" integer NOT NULL DEFAULT 30,
                "isWithinAttributionWindow" boolean NOT NULL DEFAULT false,
                "campaign" varchar(100),
                "medium" varchar(100),
                "source" varchar(100),
                "customerId" uuid,
                "isNewCustomer" boolean NOT NULL DEFAULT false,
                "isRepeatCustomer" boolean NOT NULL DEFAULT false,
                "idempotencyKey" varchar(100) NOT NULL,
                "isDuplicate" boolean NOT NULL DEFAULT false,
                "metadata" json,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "confirmedAt" timestamp,
                "cancelledAt" timestamp,
                "refundedAt" timestamp,
                CONSTRAINT "PK_conversion_events_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_conversion_events_idempotencyKey" UNIQUE ("idempotencyKey")
            )
        `);

        // 4. Create indexes for conversion_events
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_conversion_events_partnerId_createdAt" ON "conversion_events" ("partnerId", "createdAt")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_conversion_events_orderId" ON "conversion_events" ("orderId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_conversion_events_referralClickId" ON "conversion_events" ("referralClickId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_conversion_events_status_createdAt" ON "conversion_events" ("status", "createdAt")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_conversion_events_conversionType_status" ON "conversion_events" ("conversionType", "status")`);

        // 5. Create commission_policies table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "commission_policies" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "policyCode" varchar(100) NOT NULL,
                "name" varchar(200) NOT NULL,
                "description" text,
                "policyType" character varying NOT NULL,
                "status" character varying NOT NULL DEFAULT 'active',
                "priority" integer NOT NULL DEFAULT 0,
                "partnerId" uuid,
                "partnerTier" varchar(50),
                "productId" uuid,
                "supplierId" uuid,
                "category" varchar(100),
                "tags" text,
                "commissionType" character varying NOT NULL DEFAULT 'percentage',
                "commissionRate" decimal(5,2),
                "commissionAmount" decimal(10,2),
                "tieredRates" json,
                "minCommission" decimal(10,2),
                "maxCommission" decimal(10,2),
                "validFrom" timestamp,
                "validUntil" timestamp,
                "minOrderAmount" decimal(10,2),
                "maxOrderAmount" decimal(10,2),
                "requiresNewCustomer" boolean NOT NULL DEFAULT false,
                "excludeDiscountedItems" boolean NOT NULL DEFAULT false,
                "maxUsagePerPartner" integer,
                "maxUsageTotal" integer,
                "currentUsageCount" integer NOT NULL DEFAULT 0,
                "canStackWithOtherPolicies" boolean NOT NULL DEFAULT false,
                "exclusiveWith" text,
                "metadata" json,
                "requiresApproval" boolean NOT NULL DEFAULT false,
                "createdBy" uuid,
                "approvedBy" uuid,
                "approvedAt" timestamp,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_commission_policies_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_commission_policies_policyCode" UNIQUE ("policyCode")
            )
        `);

        // 6. Create indexes for commission_policies
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_commission_policies_policyType_status" ON "commission_policies" ("policyType", "status")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_commission_policies_partnerId_status" ON "commission_policies" ("partnerId", "status")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_commission_policies_productId_status" ON "commission_policies" ("productId", "status")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_commission_policies_category_status" ON "commission_policies" ("category", "status")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_commission_policies_priority_status" ON "commission_policies" ("priority", "status")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_commission_policies_validFrom_validUntil" ON "commission_policies" ("validFrom", "validUntil")`);

        // 7. Add foreign keys (check existence first)
        const clickPartnerFKExists = await queryRunner.query(`
            SELECT 1 FROM pg_constraint WHERE conname = 'FK_referral_clicks_partnerId'
        `);
        if (clickPartnerFKExists.length === 0) {
            await queryRunner.query(`
                ALTER TABLE "referral_clicks"
                ADD CONSTRAINT "FK_referral_clicks_partnerId"
                FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE
            `);
        }

        const conversionPartnerFKExists = await queryRunner.query(`
            SELECT 1 FROM pg_constraint WHERE conname = 'FK_conversion_events_partnerId'
        `);
        if (conversionPartnerFKExists.length === 0) {
            await queryRunner.query(`
                ALTER TABLE "conversion_events"
                ADD CONSTRAINT "FK_conversion_events_partnerId"
                FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE
            `);
        }

        const conversionClickFKExists = await queryRunner.query(`
            SELECT 1 FROM pg_constraint WHERE conname = 'FK_conversion_events_referralClickId'
        `);
        if (conversionClickFKExists.length === 0) {
            await queryRunner.query(`
                ALTER TABLE "conversion_events"
                ADD CONSTRAINT "FK_conversion_events_referralClickId"
                FOREIGN KEY ("referralClickId") REFERENCES "referral_clicks"("id") ON DELETE CASCADE
            `);
        }

        const conversionProductFKExists = await queryRunner.query(`
            SELECT 1 FROM pg_constraint WHERE conname = 'FK_conversion_events_productId'
        `);
        if (conversionProductFKExists.length === 0) {
            await queryRunner.query(`
                ALTER TABLE "conversion_events"
                ADD CONSTRAINT "FK_conversion_events_productId"
                FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE
            `);
        }

        // Note: FK to products from referral_clicks is optional (SET NULL)
        // Note: FK to orders from conversion_events will be added when Order entity is created
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign keys
        await queryRunner.query(`ALTER TABLE "conversion_events" DROP CONSTRAINT IF EXISTS "FK_conversion_events_productId"`);
        await queryRunner.query(`ALTER TABLE "conversion_events" DROP CONSTRAINT IF EXISTS "FK_conversion_events_referralClickId"`);
        await queryRunner.query(`ALTER TABLE "conversion_events" DROP CONSTRAINT IF EXISTS "FK_conversion_events_partnerId"`);
        await queryRunner.query(`ALTER TABLE "referral_clicks" DROP CONSTRAINT IF EXISTS "FK_referral_clicks_partnerId"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE IF EXISTS "commission_policies"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "conversion_events"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "referral_clicks"`);
    }
}
