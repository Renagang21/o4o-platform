import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * DS-2 Migration: Create dropshipping_offer_logs table
 *
 * This table stores audit logs for status changes on dropshipping entities.
 * Tracks who changed what, when, and from which state to which state.
 * Complies with DS-1 rules.
 *
 * @see docs/architecture/dropshipping-domain-rules.md
 */
export class CreateDropshippingOfferLogs2025010100004 implements MigrationInterface {
    name = 'CreateDropshippingOfferLogs2025010100004';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create dropshipping_offer_logs table
        await queryRunner.query(`
            CREATE TABLE "dropshipping_offer_logs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "entity_type" varchar(50) NOT NULL,
                "entity_id" varchar(36) NOT NULL,
                "action" varchar(50) NOT NULL,
                "from_status" varchar(20),
                "to_status" varchar(20),
                "actor_id" varchar(36),
                "actor_type" varchar(20) NOT NULL DEFAULT 'user',
                "actor_name" varchar(255),
                "reason" text,
                "changes" jsonb,
                "ip_address" varchar(45),
                "user_agent" text,
                "request_id" varchar(36),
                "metadata" jsonb,
                "created_at" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_dropshipping_offer_logs" PRIMARY KEY ("id"),
                CONSTRAINT "CHK_dropshipping_offer_logs_entity_type" CHECK (
                    "entity_type" IN ('supplier_catalog_item', 'seller_offer', 'offer_policy', 'order_relay', 'settlement')
                ),
                CONSTRAINT "CHK_dropshipping_offer_logs_actor_type" CHECK (
                    "actor_type" IN ('user', 'admin', 'system', 'scheduler')
                )
            )
        `);

        // Create indexes
        await queryRunner.query(`
            CREATE INDEX "IDX_dropshipping_offer_logs_entity"
            ON "dropshipping_offer_logs" ("entity_type", "entity_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_dropshipping_offer_logs_actor"
            ON "dropshipping_offer_logs" ("actor_id")
            WHERE "actor_id" IS NOT NULL
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_dropshipping_offer_logs_action"
            ON "dropshipping_offer_logs" ("action")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_dropshipping_offer_logs_created_at"
            ON "dropshipping_offer_logs" ("created_at")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_dropshipping_offer_logs_entity_created"
            ON "dropshipping_offer_logs" ("entity_type", "entity_id", "created_at" DESC)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_offer_logs_entity_created"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_offer_logs_created_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_offer_logs_action"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_offer_logs_actor"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_offer_logs_entity"`);

        // Drop table
        await queryRunner.query(`DROP TABLE IF EXISTS "dropshipping_offer_logs"`);
    }
}
