import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase SETTLE-1: Add PD-2 commission fields to SettlementItem and add unique constraint
 *
 * This migration integrates PD-2 commission system with Settlement system:
 * - Adds commissionType and commissionRate fields to track commission policy used
 * - Adds unique constraint on orderItemId to prevent duplicate settlements
 *
 * Changes:
 * 1. Add commissionType (enum: 'rate' | 'fixed')
 * 2. Add commissionRate (numeric: 0-1 for rate-based commissions)
 * 3. Add unique index on orderItemId to prevent double-settlement
 */
export class AddCommissionFieldsToSettlementItem1850000000000 implements MigrationInterface {
    name = 'AddCommissionFieldsToSettlementItem1850000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add commission policy fields to settlement_items table
        await queryRunner.query(`
            ALTER TABLE "settlement_items"
            ADD COLUMN "commissionType" character varying CHECK ("commissionType" IN ('rate', 'fixed')),
            ADD COLUMN "commissionRate" decimal(5,4)
        `);

        // Add comments explaining the fields
        await queryRunner.query(`
            COMMENT ON COLUMN "settlement_items"."commissionType" IS 'Phase SETTLE-1: Commission calculation type from OrderItem (rate or fixed). Used for settlement audit trail.'
        `);
        await queryRunner.query(`
            COMMENT ON COLUMN "settlement_items"."commissionRate" IS 'Phase SETTLE-1: Commission rate used (0-1, e.g., 0.20 = 20%). Only applicable for rate-based commissions.'
        `);

        // Add unique constraint on orderItemId to prevent duplicate settlements
        // This ensures each order item can only be settled once
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_settlement_items_orderItemId_unique"
            ON "settlement_items" ("orderItemId")
        `);

        // Add comment on the unique constraint
        await queryRunner.query(`
            COMMENT ON INDEX "IDX_settlement_items_orderItemId_unique" IS 'Phase SETTLE-1: Prevents duplicate settlement of the same order item'
        `);

        // Create index on commissionType for filtering
        await queryRunner.query(`
            CREATE INDEX "IDX_settlement_items_commissionType"
            ON "settlement_items" ("commissionType")
            WHERE "commissionType" IS NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_settlement_items_commissionType"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_settlement_items_orderItemId_unique"`);

        // Remove comments
        await queryRunner.query(`COMMENT ON COLUMN "settlement_items"."commissionRate" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "settlement_items"."commissionType" IS NULL`);

        // Remove columns from settlement_items
        await queryRunner.query(`
            ALTER TABLE "settlement_items"
            DROP COLUMN "commissionRate",
            DROP COLUMN "commissionType"
        `);
    }
}
