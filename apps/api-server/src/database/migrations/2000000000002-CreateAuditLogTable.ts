import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create AuditLog Table
 *
 * Creates the audit_logs table for tracking all administrative actions
 * and entity changes in the system.
 *
 * Features:
 * - Tracks changes to commissions, conversions, policies, partners, etc.
 * - Records detailed change history with before/after values
 * - Supports filtering by entity type, user, and date
 * - Optimized indexes for common query patterns
 *
 * Rollback: Drops the audit_logs table and all indexes
 *
 * @migration 2000000000002
 * @phase Phase 2.2
 */
export class CreateAuditLogTable2000000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create audit_logs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "entityType" character varying(100) NOT NULL,
        "entityId" uuid NOT NULL,
        "action" character varying(50) NOT NULL,
        "userId" uuid,
        "changes" jsonb,
        "reason" text,
        "ipAddress" character varying(50),
        "userAgent" text,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for common query patterns

    // Index for querying by entity (most common: "show me audit trail for commission X")
    const entityIndexExists = await queryRunner.query(`
      SELECT 1 FROM pg_indexes
      WHERE indexname = 'IDX_audit_logs_entity'
    `);
    if (!entityIndexExists || entityIndexExists.length === 0) {
      await queryRunner.query(`
        CREATE INDEX "IDX_audit_logs_entity"
        ON "audit_logs" ("entityType", "entityId")
      `);
    }

    // Index for querying by user (admin activity reports)
    const userIndexExists = await queryRunner.query(`
      SELECT 1 FROM pg_indexes
      WHERE indexname = 'IDX_audit_logs_user'
    `);
    if (!userIndexExists || userIndexExists.length === 0) {
      await queryRunner.query(`
        CREATE INDEX "IDX_audit_logs_user"
        ON "audit_logs" ("userId")
      `);
    }

    // Index for time-based queries (recent activity, date range filters)
    const createdIndexExists = await queryRunner.query(`
      SELECT 1 FROM pg_indexes
      WHERE indexname = 'IDX_audit_logs_created'
    `);
    if (!createdIndexExists || createdIndexExists.length === 0) {
      await queryRunner.query(`
        CREATE INDEX "IDX_audit_logs_created"
        ON "audit_logs" ("createdAt" DESC)
      `);
    }

    // Index for action-based filtering (show all 'adjusted' or 'refunded' actions)
    const actionIndexExists = await queryRunner.query(`
      SELECT 1 FROM pg_indexes
      WHERE indexname = 'IDX_audit_logs_action'
    `);
    if (!actionIndexExists || actionIndexExists.length === 0) {
      await queryRunner.query(`
        CREATE INDEX "IDX_audit_logs_action"
        ON "audit_logs" ("action")
      `);
    }

    // Add foreign key to users table
    const fkExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'FK_audit_logs_user'
    `);
    if (!fkExists || fkExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "audit_logs"
        ADD CONSTRAINT "FK_audit_logs_user"
        FOREIGN KEY ("userId")
        REFERENCES "users"("id")
        ON DELETE SET NULL
        ON UPDATE NO ACTION
      `);
    }

    console.log('✅ Created audit_logs table with indexes and foreign keys');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      DROP CONSTRAINT IF EXISTS "FK_audit_logs_user"
    `);

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_entity"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_action"`);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);

    console.log('✅ Rolled back audit_logs table');
  }
}
