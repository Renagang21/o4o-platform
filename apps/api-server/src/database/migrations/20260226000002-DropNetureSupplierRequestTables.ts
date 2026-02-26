import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-REMOVAL-V1
 *
 * Drops the v1 supplier request tables and their enum types:
 * - neture_supplier_request_events (audit trail)
 * - neture_supplier_requests (6-state request lifecycle)
 * - neture_supplier_request_status_enum
 * - neture_request_event_type_enum
 *
 * All read/write paths have been migrated to product_approvals (v2).
 * This migration is the final physical removal step.
 */
export class DropNetureSupplierRequestTables20260226000002
  implements MigrationInterface
{
  name = 'DropNetureSupplierRequestTables20260226000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Safety: Drop any FK constraints referencing these tables
    const fks: Array<{ constraint_name: string; table_name: string }> = await queryRunner.query(`
      SELECT constraint_name, table_name
      FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY'
        AND (table_name IN ('neture_supplier_requests', 'neture_supplier_request_events')
          OR constraint_name LIKE '%supplier_request%')
    `);
    for (const fk of fks) {
      await queryRunner.query(
        `ALTER TABLE "${fk.table_name}" DROP CONSTRAINT IF EXISTS "${fk.constraint_name}"`,
      );
    }

    // Drop events table first (may reference request_id)
    await queryRunner.query(`DROP TABLE IF EXISTS "neture_supplier_request_events" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "neture_supplier_requests" CASCADE`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "neture_supplier_request_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "neture_request_event_type_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate enum types
    await queryRunner.query(`
      CREATE TYPE "neture_supplier_request_status_enum"
        AS ENUM ('pending', 'approved', 'rejected', 'suspended', 'revoked', 'expired')
    `);

    await queryRunner.query(`
      CREATE TYPE "neture_request_event_type_enum"
        AS ENUM ('created', 'approved', 'rejected', 'suspended', 'reactivated', 'revoked', 'expired')
    `);

    // Recreate neture_supplier_requests table
    await queryRunner.query(`
      CREATE TABLE "neture_supplier_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "supplier_id" character varying NOT NULL,
        "supplier_name" character varying,
        "seller_id" character varying NOT NULL,
        "seller_name" character varying NOT NULL,
        "seller_email" character varying,
        "seller_phone" character varying,
        "seller_store_url" text,
        "service_id" character varying NOT NULL,
        "service_name" character varying NOT NULL,
        "product_id" character varying NOT NULL,
        "product_name" character varying NOT NULL,
        "product_category" character varying,
        "product_purpose" character varying,
        "status" "neture_supplier_request_status_enum" NOT NULL DEFAULT 'pending',
        "decided_by" character varying,
        "decided_at" timestamp,
        "reject_reason" text,
        "suspended_at" timestamp with time zone,
        "revoked_at" timestamp with time zone,
        "expired_at" timestamp with time zone,
        "relation_note" text,
        "effective_until" timestamp with time zone,
        "metadata" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_neture_supplier_requests" PRIMARY KEY ("id")
      )
    `);

    // Recreate neture_supplier_request_events table
    await queryRunner.query(`
      CREATE TABLE "neture_supplier_request_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "request_id" character varying NOT NULL,
        "event_type" "neture_request_event_type_enum" NOT NULL,
        "actor_id" character varying NOT NULL,
        "actor_name" character varying,
        "seller_id" character varying NOT NULL,
        "seller_name" character varying NOT NULL,
        "product_id" character varying NOT NULL,
        "product_name" character varying NOT NULL,
        "service_id" character varying NOT NULL,
        "service_name" character varying NOT NULL,
        "from_status" character varying,
        "to_status" character varying NOT NULL,
        "reason" text,
        "metadata" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_neture_supplier_request_events" PRIMARY KEY ("id")
      )
    `);
  }
}
