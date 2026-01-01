import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * DS-4 Migration: Create dropshipping_order_relay_logs table
 *
 * OrderRelayLog는 주문 상태 변경 감사 로그입니다.
 * - DS-4.1/DS-4.3 준수
 * - 모든 상태 변경은 반드시 로그에 기록
 * - actor, previousStatus, newStatus, timestamp, reason 포함
 *
 * @see docs/architecture/dropshipping-order-relay.md
 */
export class CreateDropshippingOrderRelayLogs2025010100007 implements MigrationInterface {
    name = 'CreateDropshippingOrderRelayLogs2025010100007';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create enum type for order relay log action
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "dropshipping_order_relay_log_action_enum" AS ENUM (
                    'created', 'status_changed', 'data_updated', 'relay_dispatched', 'external_sync'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Create dropshipping_order_relay_logs table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "dropshipping_order_relay_logs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "order_relay_id" uuid NOT NULL,
                "action" "dropshipping_order_relay_log_action_enum" NOT NULL,
                "previous_status" "dropshipping_order_relay_status_enum",
                "new_status" "dropshipping_order_relay_status_enum",
                "actor" varchar(100) NOT NULL,
                "actor_type" varchar(50) NOT NULL DEFAULT 'admin',
                "reason" text,
                "previous_data" jsonb,
                "new_data" jsonb,
                "metadata" jsonb,
                "created_at" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_dropshipping_order_relay_logs" PRIMARY KEY ("id"),
                CONSTRAINT "FK_dropshipping_order_relay_logs_order_relay"
                    FOREIGN KEY ("order_relay_id")
                    REFERENCES "dropshipping_order_relays" ("id")
                    ON DELETE CASCADE
            )
        `);

        // Create indexes
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_dropshipping_order_relay_logs_order_relay_id"
            ON "dropshipping_order_relay_logs" ("order_relay_id")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_dropshipping_order_relay_logs_action"
            ON "dropshipping_order_relay_logs" ("action")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_dropshipping_order_relay_logs_created_at"
            ON "dropshipping_order_relay_logs" ("created_at" DESC)
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_dropshipping_order_relay_logs_composite"
            ON "dropshipping_order_relay_logs" ("order_relay_id", "created_at" DESC)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_order_relay_logs_composite"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_order_relay_logs_created_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_order_relay_logs_action"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_order_relay_logs_order_relay_id"`);

        // Drop table
        await queryRunner.query(`DROP TABLE IF EXISTS "dropshipping_order_relay_logs"`);

        // Drop enum type
        await queryRunner.query(`DROP TYPE IF EXISTS "dropshipping_order_relay_log_action_enum"`);
    }
}
