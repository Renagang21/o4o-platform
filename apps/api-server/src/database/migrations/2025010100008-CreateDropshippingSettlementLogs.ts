import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * DS-4 Migration: Create dropshipping_settlement_logs table
 *
 * SettlementLog는 정산 배치 상태 변경 감사 로그입니다.
 * - DS-4.2/DS-4.3 준수
 * - 모든 상태 변경은 반드시 로그에 기록
 * - 계산 실행, 확정, 조정 등 모든 작업 기록
 *
 * @see docs/architecture/dropshipping-settlement-model.md
 */
export class CreateDropshippingSettlementLogs2025010100008 implements MigrationInterface {
    name = 'CreateDropshippingSettlementLogs2025010100008';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create enum type for settlement log action
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "dropshipping_settlement_log_action_enum" AS ENUM (
                    'created', 'status_changed', 'calculation_executed', 'confirmed',
                    'adjustment_added', 'payment_initiated', 'payment_completed', 'payment_failed'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Create dropshipping_settlement_logs table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "dropshipping_settlement_logs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "settlement_batch_id" uuid NOT NULL,
                "action" "dropshipping_settlement_log_action_enum" NOT NULL,
                "previous_status" "dropshipping_settlement_batch_status_enum",
                "new_status" "dropshipping_settlement_batch_status_enum",
                "actor" varchar(100) NOT NULL,
                "actor_type" varchar(50) NOT NULL DEFAULT 'admin',
                "reason" text,
                "calculation_details" jsonb,
                "adjustment_details" jsonb,
                "metadata" jsonb,
                "created_at" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_dropshipping_settlement_logs" PRIMARY KEY ("id"),
                CONSTRAINT "FK_dropshipping_settlement_logs_settlement_batch"
                    FOREIGN KEY ("settlement_batch_id")
                    REFERENCES "dropshipping_settlement_batches" ("id")
                    ON DELETE CASCADE
            )
        `);

        // Create indexes
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_dropshipping_settlement_logs_settlement_batch_id"
            ON "dropshipping_settlement_logs" ("settlement_batch_id")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_dropshipping_settlement_logs_action"
            ON "dropshipping_settlement_logs" ("action")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_dropshipping_settlement_logs_created_at"
            ON "dropshipping_settlement_logs" ("created_at" DESC)
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_dropshipping_settlement_logs_composite"
            ON "dropshipping_settlement_logs" ("settlement_batch_id", "created_at" DESC)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_settlement_logs_composite"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_settlement_logs_created_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_settlement_logs_action"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_settlement_logs_settlement_batch_id"`);

        // Drop table
        await queryRunner.query(`DROP TABLE IF EXISTS "dropshipping_settlement_logs"`);

        // Drop enum type
        await queryRunner.query(`DROP TYPE IF EXISTS "dropshipping_settlement_log_action_enum"`);
    }
}
