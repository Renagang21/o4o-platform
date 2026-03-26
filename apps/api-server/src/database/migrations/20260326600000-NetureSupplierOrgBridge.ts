/**
 * WO-O4O-NETURE-ORG-DATA-MODEL-V1 — Phase 2-A
 *
 * Bridge neture_suppliers → organizations for O4O Organization Standard.
 *
 * Pattern: K-Cosmetics Store Bridge (20260311200000-CosmeticsStoreOrgBridge.ts)
 *
 * 1. Add organization_id column to neture_suppliers
 * 2. Create organizations records for ACTIVE neture_suppliers
 * 3. Link existing suppliers via 'neture-{slug}' code match
 * 4. Create organization_members (supplier owner)
 * 5. Create organization_service_enrollments (service_code='neture')
 * 6. Verification: all ACTIVE suppliers must have organization_id
 *
 * Idempotent: IF NOT EXISTS / ON CONFLICT guards on all operations.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class NetureSupplierOrgBridge20260326600000
  implements MigrationInterface
{
  name = 'NetureSupplierOrgBridge20260326600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // Guard: skip if neture_suppliers table does not exist
    // ============================================================
    const hasTable = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'neture_suppliers'
      ) AS exists
    `);
    if (!hasTable[0]?.exists) {
      return;
    }

    // ============================================================
    // 1. Add organization_id column to neture_suppliers
    // ============================================================
    const hasCol = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'neture_suppliers'
          AND column_name = 'organization_id'
      ) AS exists
    `);
    if (!hasCol[0]?.exists) {
      await queryRunner.query(`
        ALTER TABLE neture_suppliers
          ADD COLUMN organization_id UUID
      `);
    }

    // ============================================================
    // 2. Create organizations records for ACTIVE neture_suppliers
    //
    // Code format: 'neture-{slug}' to avoid collision with other services.
    // ON CONFLICT: update name to ensure we can always retrieve the org id.
    // ============================================================
    await queryRunner.query(`
      INSERT INTO organizations (
        id, name, code, type, level, path,
        business_number, address, phone,
        created_by_user_id, "isActive",
        metadata, "createdAt", "updatedAt"
      )
      SELECT
        gen_random_uuid(),
        ns.name,
        'neture-' || ns.slug,
        'supplier',
        0,
        '/neture-' || ns.slug,
        ns.business_number,
        ns.business_address,
        ns.contact_phone,
        ns.user_id,
        (ns.status = 'ACTIVE'),
        jsonb_build_object('serviceKey', 'neture', 'netureSupplierSlug', ns.slug),
        ns.created_at,
        ns.updated_at
      FROM neture_suppliers ns
      WHERE NOT EXISTS (
        SELECT 1 FROM organizations o WHERE o.code = 'neture-' || ns.slug
      )
    `);

    // ============================================================
    // 3. Link neture_suppliers.organization_id via code match
    // ============================================================
    await queryRunner.query(`
      UPDATE neture_suppliers ns
      SET organization_id = o.id
      FROM organizations o
      WHERE o.code = 'neture-' || ns.slug
        AND ns.organization_id IS NULL
    `);

    // ============================================================
    // 4. Create index on organization_id
    // ============================================================
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_neture_suppliers_org_id
        ON neture_suppliers (organization_id)
        WHERE organization_id IS NOT NULL
    `);

    // ============================================================
    // 5. Create organization_members (supplier owner)
    //
    // Only for suppliers with both organization_id and user_id.
    // ============================================================
    await queryRunner.query(`
      INSERT INTO organization_members (
        id, organization_id, user_id, role, is_primary, joined_at, created_at, updated_at
      )
      SELECT
        gen_random_uuid(),
        ns.organization_id,
        ns.user_id,
        'owner',
        true,
        ns.created_at,
        NOW(),
        NOW()
      FROM neture_suppliers ns
      WHERE ns.organization_id IS NOT NULL
        AND ns.user_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.organization_id = ns.organization_id AND om.user_id = ns.user_id
        )
    `);

    // ============================================================
    // 6. Create organization_service_enrollments
    //
    // Only for ACTIVE suppliers.
    // ============================================================
    const hasEnrollTable = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'organization_service_enrollments'
      ) AS exists
    `);
    if (hasEnrollTable[0]?.exists) {
      await queryRunner.query(`
        INSERT INTO organization_service_enrollments (
          id, organization_id, service_code, status, enrolled_at, created_at, updated_at
        )
        SELECT
          gen_random_uuid(),
          ns.organization_id,
          'neture',
          'active',
          NOW(),
          NOW(),
          NOW()
        FROM neture_suppliers ns
        WHERE ns.organization_id IS NOT NULL
          AND ns.status = 'ACTIVE'
          AND NOT EXISTS (
            SELECT 1 FROM organization_service_enrollments ose
            WHERE ose.organization_id = ns.organization_id AND ose.service_code = 'neture'
          )
      `);
    }

    // ============================================================
    // 7. Verification: all ACTIVE suppliers must have organization_id
    // ============================================================
    const orphans = await queryRunner.query(`
      SELECT COUNT(*)::int AS count
      FROM neture_suppliers
      WHERE status = 'ACTIVE' AND organization_id IS NULL
    `);
    const orphanCount = orphans[0]?.count ?? 0;
    if (orphanCount > 0) {
      console.warn(
        `[NetureSupplierOrgBridge] WARNING: ${orphanCount} ACTIVE suppliers without organization_id`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Guard: skip if neture_suppliers table does not exist
    const hasTable = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'neture_suppliers'
      ) AS exists
    `);
    if (!hasTable[0]?.exists) {
      return;
    }

    // 1. Remove organization_service_enrollments for neture suppliers
    const hasEnrollTable = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'organization_service_enrollments'
      ) AS exists
    `);
    if (hasEnrollTable[0]?.exists) {
      await queryRunner.query(`
        DELETE FROM organization_service_enrollments ose
        USING organizations o
        WHERE ose.organization_id = o.id
          AND ose.service_code = 'neture'
          AND o.metadata->>'serviceKey' = 'neture'
      `);
    }

    // 2. Remove organization_members created by this migration
    await queryRunner.query(`
      DELETE FROM organization_members om
      USING organizations o
      WHERE om.organization_id = o.id
        AND o.metadata->>'serviceKey' = 'neture'
    `);

    // 3. Remove organization_id column from neture_suppliers
    const hasCol = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'neture_suppliers'
          AND column_name = 'organization_id'
      ) AS exists
    `);
    if (hasCol[0]?.exists) {
      await queryRunner.query(`
        DROP INDEX IF EXISTS idx_neture_suppliers_org_id
      `);
      await queryRunner.query(`
        ALTER TABLE neture_suppliers DROP COLUMN organization_id
      `);
    }

    // 4. Remove organizations created for neture suppliers
    await queryRunner.query(`
      DELETE FROM organizations
      WHERE metadata->>'serviceKey' = 'neture'
    `);
  }
}
