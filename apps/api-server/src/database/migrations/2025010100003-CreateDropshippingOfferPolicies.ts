import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * DS-2 Migration: Create dropshipping_offer_policies table
 *
 * This table stores policies attached to seller offers.
 * Includes shipping, return, and settlement policies.
 * Complies with DS-1 rules.
 *
 * @see docs/architecture/dropshipping-domain-rules.md
 */
export class CreateDropshippingOfferPolicies2025010100003 implements MigrationInterface {
    name = 'CreateDropshippingOfferPolicies2025010100003';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create dropshipping_offer_policies table
        await queryRunner.query(`
            CREATE TABLE "dropshipping_offer_policies" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "seller_offer_id" varchar(36) NOT NULL,
                "shipping_policy" jsonb,
                "return_policy" jsonb,
                "settlement_policy" jsonb,
                "warranty_policy" jsonb,
                "customer_service_policy" jsonb,
                "free_shipping_threshold" decimal(12,2),
                "return_period_days" integer DEFAULT 14,
                "exchange_allowed" boolean NOT NULL DEFAULT true,
                "refund_allowed" boolean NOT NULL DEFAULT true,
                "settlement_cycle" varchar(20) NOT NULL DEFAULT 'monthly',
                "settlement_day" integer,
                "commission_rate" decimal(5,2),
                "notes" text,
                "is_active" boolean NOT NULL DEFAULT true,
                "effective_from" timestamp,
                "effective_until" timestamp,
                "created_at" timestamp NOT NULL DEFAULT now(),
                "updated_at" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_dropshipping_offer_policies" PRIMARY KEY ("id"),
                CONSTRAINT "CHK_dropshipping_offer_policies_settlement_cycle" CHECK (
                    "settlement_cycle" IN ('weekly', 'biweekly', 'monthly', 'quarterly')
                )
            )
        `);

        // Create indexes
        await queryRunner.query(`
            CREATE INDEX "IDX_dropshipping_offer_policies_seller_offer_id"
            ON "dropshipping_offer_policies" ("seller_offer_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_dropshipping_offer_policies_active"
            ON "dropshipping_offer_policies" ("is_active")
            WHERE "is_active" = true
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_dropshipping_offer_policies_effective"
            ON "dropshipping_offer_policies" ("effective_from", "effective_until")
            WHERE "is_active" = true
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_offer_policies_effective"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_offer_policies_active"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_offer_policies_seller_offer_id"`);

        // Drop table
        await queryRunner.query(`DROP TABLE IF EXISTS "dropshipping_offer_policies"`);
    }
}
