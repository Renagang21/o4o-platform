import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * DS-4 Migration: Create dropshipping_order_relays table
 *
 * OrderRelay는 프로세스 엔티티로서 주문 전달 및 이행 상태를 추적합니다.
 * - 결제/환불 처리 금지 (DS-4.1)
 * - Ecommerce Core 경유 필수
 * - 모든 상태 변경은 명시적 메서드 + 로그 기록
 *
 * Complies with DS-1 rules:
 * - dropshipping_ prefix required
 * - No FK constraints to Core tables
 * - External IDs stored as UUID strings (soft FK)
 *
 * @see docs/architecture/dropshipping-order-relay.md
 */
export class CreateDropshippingOrderRelays2025010100005 implements MigrationInterface {
    name = 'CreateDropshippingOrderRelays2025010100005';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create enum type for order relay status
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "dropshipping_order_relay_status_enum" AS ENUM (
                    'pending', 'relayed', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Create dropshipping_order_relays table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "dropshipping_order_relays" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "ecommerce_order_id" uuid,
                "listing_id" uuid NOT NULL,
                "external_order_id" varchar(255),
                "order_number" varchar(255) NOT NULL,
                "quantity" integer NOT NULL,
                "unit_price" decimal(10,2) NOT NULL,
                "total_price" decimal(10,2) NOT NULL,
                "status" "dropshipping_order_relay_status_enum" NOT NULL DEFAULT 'pending',
                "shipping_info" jsonb,
                "customer_info" jsonb,
                "relayed_at" timestamp,
                "confirmed_at" timestamp,
                "shipped_at" timestamp,
                "delivered_at" timestamp,
                "metadata" jsonb,
                "created_at" timestamp NOT NULL DEFAULT now(),
                "updated_at" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_dropshipping_order_relays" PRIMARY KEY ("id")
            )
        `);

        // Create indexes
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_dropshipping_order_relays_listing_id"
            ON "dropshipping_order_relays" ("listing_id")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_dropshipping_order_relays_status"
            ON "dropshipping_order_relays" ("status")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_dropshipping_order_relays_ecommerce_order_id"
            ON "dropshipping_order_relays" ("ecommerce_order_id")
            WHERE "ecommerce_order_id" IS NOT NULL
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_dropshipping_order_relays_order_number"
            ON "dropshipping_order_relays" ("order_number")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_dropshipping_order_relays_external_order_id"
            ON "dropshipping_order_relays" ("external_order_id")
            WHERE "external_order_id" IS NOT NULL
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_dropshipping_order_relays_created_at"
            ON "dropshipping_order_relays" ("created_at" DESC)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_order_relays_created_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_order_relays_external_order_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_order_relays_order_number"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_order_relays_ecommerce_order_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_order_relays_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_order_relays_listing_id"`);

        // Drop table
        await queryRunner.query(`DROP TABLE IF EXISTS "dropshipping_order_relays"`);

        // Drop enum type
        await queryRunner.query(`DROP TYPE IF EXISTS "dropshipping_order_relay_status_enum"`);
    }
}
