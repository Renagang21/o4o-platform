/**
 * WO-O4O-NETURE-SUPPLIER-COLUMN-REMOVAL-V1 — Phase 5-D
 *
 * Drop deprecated columns from neture_suppliers:
 *   - name (→ organizations.name)
 *   - business_number (→ organizations.business_number)
 *   - business_address (→ organizations.address)
 *
 * These columns were made redundant by the Supplier↔Organization Bridge
 * (WO-O4O-NETURE-ORG-DATA-MODEL-V1). All reads now go through the
 * organizations table. Gate checks confirmed 0 mismatches and 0 orphans.
 *
 * Idempotent: IF EXISTS guards on all DROP operations.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropNetureSupplierDeprecatedColumns20260327000300
  implements MigrationInterface
{
  name = 'DropNetureSupplierDeprecatedColumns20260327000300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guard: skip if table doesn't exist
    const hasTable = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'neture_suppliers'
      ) AS exists
    `);
    if (!hasTable[0]?.exists) return;

    // Step 1: Make 'name' nullable first (safety for any in-flight writes during deployment)
    const hasNameCol = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'neture_suppliers' AND column_name = 'name'
      ) AS exists
    `);
    if (hasNameCol[0]?.exists) {
      await queryRunner.query(`ALTER TABLE neture_suppliers ALTER COLUMN name DROP NOT NULL`);
      await queryRunner.query(`ALTER TABLE neture_suppliers DROP COLUMN name`);
    }

    // Step 2: Drop business_number (already nullable)
    const hasBnCol = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'neture_suppliers' AND column_name = 'business_number'
      ) AS exists
    `);
    if (hasBnCol[0]?.exists) {
      await queryRunner.query(`ALTER TABLE neture_suppliers DROP COLUMN business_number`);
    }

    // Step 3: Drop business_address (already nullable)
    const hasBaCol = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'neture_suppliers' AND column_name = 'business_address'
      ) AS exists
    `);
    if (hasBaCol[0]?.exists) {
      await queryRunner.query(`ALTER TABLE neture_suppliers DROP COLUMN business_address`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore columns (data is NOT restored — org table is SSOT)
    await queryRunner.query(`
      ALTER TABLE neture_suppliers
        ADD COLUMN IF NOT EXISTS name varchar(255),
        ADD COLUMN IF NOT EXISTS business_number varchar(20),
        ADD COLUMN IF NOT EXISTS business_address text
    `);

    // Backfill from organizations for rollback
    await queryRunner.query(`
      UPDATE neture_suppliers ns
      SET name = o.name,
          business_number = o.business_number,
          business_address = o.address
      FROM organizations o
      WHERE o.id = ns.organization_id
        AND ns.name IS NULL
    `);
  }
}
