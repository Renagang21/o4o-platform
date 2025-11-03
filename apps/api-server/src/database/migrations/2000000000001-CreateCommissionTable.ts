import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 2.1 Migration (Part 2): Commission Storage Table
 *
 * Creates the commissions table for storing commission records.
 * This completes the Phase 2.1 closed-loop: Click → Conversion → Commission (stored)
 *
 * Related entities: Commission.ts
 * Depends on: 2000000000000-CreateTrackingAndCommissionTables (conversion_events, commission_policies)
 */
export class CreateCommissionTable2000000000001 implements MigrationInterface {
    name = 'CreateCommissionTable2000000000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create commissions table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "commissions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "partnerId" uuid NOT NULL,
                "productId" uuid NOT NULL,
                "sellerId" uuid,
                "orderId" uuid NOT NULL,
                "conversionId" uuid NOT NULL,
                "referralCode" varchar(20) NOT NULL,
                "status" character varying NOT NULL DEFAULT 'pending',
                "commissionAmount" decimal(10,2) NOT NULL,
                "orderAmount" decimal(10,2) NOT NULL,
                "currency" varchar(3) NOT NULL DEFAULT 'KRW',
                "commissionRate" decimal(5,2),
                "policyId" uuid NOT NULL,
                "policyType" varchar(50) NOT NULL,
                "holdUntil" timestamp NOT NULL,
                "paymentMethod" varchar(100),
                "paymentReference" varchar(200),
                "metadata" json,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "confirmedAt" timestamp,
                "paidAt" timestamp,
                "cancelledAt" timestamp,
                CONSTRAINT "PK_commissions_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_commissions_conversionId" UNIQUE ("conversionId")
            )
        `);

        // 2. Create indexes for commissions
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_commissions_partnerId_status" ON "commissions" ("partnerId", "status")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_commissions_conversionId" ON "commissions" ("conversionId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_commissions_status_createdAt" ON "commissions" ("status", "createdAt")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_commissions_holdUntil" ON "commissions" ("holdUntil")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_commissions_policyId_status" ON "commissions" ("policyId", "status")`);

        // 3. Add foreign keys (check existence first)
        const commissionPartnerFKExists = await queryRunner.query(`
            SELECT 1 FROM pg_constraint WHERE conname = 'FK_commissions_partnerId'
        `);
        if (commissionPartnerFKExists.length === 0) {
            await queryRunner.query(`
                ALTER TABLE "commissions"
                ADD CONSTRAINT "FK_commissions_partnerId"
                FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE
            `);
        }

        const commissionProductFKExists = await queryRunner.query(`
            SELECT 1 FROM pg_constraint WHERE conname = 'FK_commissions_productId'
        `);
        if (commissionProductFKExists.length === 0) {
            await queryRunner.query(`
                ALTER TABLE "commissions"
                ADD CONSTRAINT "FK_commissions_productId"
                FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE
            `);
        }

        const commissionConversionFKExists = await queryRunner.query(`
            SELECT 1 FROM pg_constraint WHERE conname = 'FK_commissions_conversionId'
        `);
        if (commissionConversionFKExists.length === 0) {
            await queryRunner.query(`
                ALTER TABLE "commissions"
                ADD CONSTRAINT "FK_commissions_conversionId"
                FOREIGN KEY ("conversionId") REFERENCES "conversion_events"("id") ON DELETE CASCADE
            `);
        }

        const commissionPolicyFKExists = await queryRunner.query(`
            SELECT 1 FROM pg_constraint WHERE conname = 'FK_commissions_policyId'
        `);
        if (commissionPolicyFKExists.length === 0) {
            await queryRunner.query(`
                ALTER TABLE "commissions"
                ADD CONSTRAINT "FK_commissions_policyId"
                FOREIGN KEY ("policyId") REFERENCES "commission_policies"("id") ON DELETE RESTRICT
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign keys
        await queryRunner.query(`ALTER TABLE "commissions" DROP CONSTRAINT IF EXISTS "FK_commissions_policyId"`);
        await queryRunner.query(`ALTER TABLE "commissions" DROP CONSTRAINT IF EXISTS "FK_commissions_conversionId"`);
        await queryRunner.query(`ALTER TABLE "commissions" DROP CONSTRAINT IF EXISTS "FK_commissions_productId"`);
        await queryRunner.query(`ALTER TABLE "commissions" DROP CONSTRAINT IF EXISTS "FK_commissions_partnerId"`);

        // Drop table
        await queryRunner.query(`DROP TABLE IF EXISTS "commissions"`);
    }
}
