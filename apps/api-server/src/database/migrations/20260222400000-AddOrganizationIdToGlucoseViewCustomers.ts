import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-CARE-ORG-SCOPE-MIGRATION-V1
 *
 * Add organization_id to glucoseview_customers for organization-scoped Care model.
 * - pharmacist_id remains as "registered by" reference
 * - organization_id becomes the primary scoping column
 * - Backfill from organizations.created_by_user_id mapping
 */
export class AddOrganizationIdToGlucoseViewCustomers20260222400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add column (nullable initially for safe rollout)
    await queryRunner.query(`
      ALTER TABLE glucoseview_customers
      ADD COLUMN IF NOT EXISTS organization_id UUID
    `);

    // 2. Backfill: pharmacist_id(varchar) → organization via created_by_user_id(uuid)
    //    CAST required: pharmacist_id is VARCHAR(255), created_by_user_id is UUID
    await queryRunner.query(`
      UPDATE glucoseview_customers gc
      SET organization_id = o.id
      FROM organizations o
      WHERE o.created_by_user_id = gc.pharmacist_id::uuid
        AND o."isActive" = true
        AND gc.organization_id IS NULL
    `);

    // 3. Index for org-scoped queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_gv_customers_organization_id
      ON glucoseview_customers (organization_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_gv_customers_organization_id`);
    await queryRunner.query(`ALTER TABLE glucoseview_customers DROP COLUMN IF EXISTS organization_id`);
  }
}
