import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * DS-4 Migration: Create dropshipping_settlement_batches table
 *
 * SettlementBatch는 정산 계약 엔티티로서 계산과 확정만 담당합니다.
 * - PG/외부 결제 시스템 연동 없음 (DS-4.2)
 * - 실제 송금 처리는 Finance 담당
 * - 상태 변경은 화이트리스트 전이만 허용
 *
 * Complies with DS-1 rules:
 * - dropshipping_ prefix required
 * - No FK constraints to Core tables
 *
 * @see docs/architecture/dropshipping-settlement-model.md
 */
export class CreateDropshippingSettlementBatches2025010100006 implements MigrationInterface {
    name = 'CreateDropshippingSettlementBatches2025010100006';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create enum type for settlement batch status
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "dropshipping_settlement_batch_status_enum" AS ENUM (
                    'open', 'closed', 'processing', 'paid', 'failed'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Create enum type for settlement type
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "dropshipping_settlement_type_enum" AS ENUM (
                    'seller', 'supplier', 'platform-extension'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Create dropshipping_settlement_batches table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "dropshipping_settlement_batches" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "settlement_type" "dropshipping_settlement_type_enum" NOT NULL DEFAULT 'seller',
                "context_type" varchar(50) NOT NULL DEFAULT 'seller',
                "seller_id" uuid,
                "supplier_id" uuid,
                "partner_id" uuid,
                "extension_type" varchar(50),
                "batch_number" varchar(255) NOT NULL,
                "period_start" date NOT NULL,
                "period_end" date NOT NULL,
                "total_amount" decimal(12,2) NOT NULL DEFAULT 0,
                "commission_amount" decimal(12,2) NOT NULL DEFAULT 0,
                "deduction_amount" decimal(12,2) NOT NULL DEFAULT 0,
                "net_amount" decimal(12,2) NOT NULL DEFAULT 0,
                "status" "dropshipping_settlement_batch_status_enum" NOT NULL DEFAULT 'open',
                "closed_at" timestamp,
                "paid_at" timestamp,
                "metadata" jsonb,
                "created_at" timestamp NOT NULL DEFAULT now(),
                "updated_at" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_dropshipping_settlement_batches" PRIMARY KEY ("id")
            )
        `);

        // Create indexes
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_dropshipping_settlement_batches_settlement_type"
            ON "dropshipping_settlement_batches" ("settlement_type")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_dropshipping_settlement_batches_context_type"
            ON "dropshipping_settlement_batches" ("context_type")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_dropshipping_settlement_batches_seller_id"
            ON "dropshipping_settlement_batches" ("seller_id")
            WHERE "seller_id" IS NOT NULL
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_dropshipping_settlement_batches_supplier_id"
            ON "dropshipping_settlement_batches" ("supplier_id")
            WHERE "supplier_id" IS NOT NULL
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_dropshipping_settlement_batches_status"
            ON "dropshipping_settlement_batches" ("status")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_dropshipping_settlement_batches_period"
            ON "dropshipping_settlement_batches" ("period_start", "period_end")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_dropshipping_settlement_batches_batch_number"
            ON "dropshipping_settlement_batches" ("batch_number")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_settlement_batches_batch_number"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_settlement_batches_period"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_settlement_batches_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_settlement_batches_supplier_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_settlement_batches_seller_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_settlement_batches_context_type"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dropshipping_settlement_batches_settlement_type"`);

        // Drop table
        await queryRunner.query(`DROP TABLE IF EXISTS "dropshipping_settlement_batches"`);

        // Drop enum types
        await queryRunner.query(`DROP TYPE IF EXISTS "dropshipping_settlement_type_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "dropshipping_settlement_batch_status_enum"`);
    }
}
