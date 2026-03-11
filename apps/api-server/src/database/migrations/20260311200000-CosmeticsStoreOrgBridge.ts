/**
 * WO-O4O-COSMETICS-STORE-HUB-ADOPTION-V1
 *
 * Bridge cosmetics_stores → organizations for Store HUB integration.
 *
 * 1. Create organizations records for existing approved cosmetics_stores
 * 2. Add organization_id column to cosmetics_stores
 * 3. Link existing stores via code match
 * 4. Create organization_members from cosmetics_store_members (owner/manager)
 *
 * Idempotent: NOT EXISTS guards on all INSERTs, IF NOT EXISTS on ALTER.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CosmeticsStoreOrgBridge20260311200000
  implements MigrationInterface
{
  name = 'CosmeticsStoreOrgBridge20260311200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guard: skip if cosmetics_stores table does not exist
    const hasTable = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'cosmetics' AND table_name = 'cosmetics_stores'
      ) AS exists
    `);
    if (!hasTable[0]?.exists) {
      return;
    }

    // 1. Create organizations records for approved cosmetics_stores
    await queryRunner.query(`
      INSERT INTO organizations (id, name, code, type, level, path, "isActive",
        address, phone, business_number, metadata, "createdAt", "updatedAt")
      SELECT
        gen_random_uuid(),
        cs.name,
        cs.code,
        'store',
        0,
        '/' || cs.code,
        (cs.status = 'approved'),
        cs.address,
        cs.contact_phone,
        cs.business_number,
        jsonb_build_object('serviceKey', 'cosmetics', 'cosmeticsStoreId', cs.id::text),
        cs.created_at,
        cs.updated_at
      FROM cosmetics.cosmetics_stores cs
      WHERE cs.status = 'approved'
        AND NOT EXISTS (
          SELECT 1 FROM organizations o WHERE o.code = cs.code
        )
    `);

    // 2. Add organization_id column to cosmetics_stores
    const hasCol = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'cosmetics'
          AND table_name = 'cosmetics_stores'
          AND column_name = 'organization_id'
      ) AS exists
    `);
    if (!hasCol[0]?.exists) {
      await queryRunner.query(`
        ALTER TABLE cosmetics.cosmetics_stores
          ADD COLUMN organization_id UUID
      `);
    }

    // 3. Link existing stores via code match
    await queryRunner.query(`
      UPDATE cosmetics.cosmetics_stores cs
      SET organization_id = o.id
      FROM organizations o
      WHERE o.code = cs.code AND cs.organization_id IS NULL
    `);

    // 4. Create index on organization_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cosmetics_store_org_id
        ON cosmetics.cosmetics_stores (organization_id)
        WHERE organization_id IS NOT NULL
    `);

    // 5. Create organization_members from cosmetics_store_members (owner/manager)
    const hasMembers = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'cosmetics' AND table_name = 'cosmetics_store_members'
      ) AS exists
    `);
    if (hasMembers[0]?.exists) {
      await queryRunner.query(`
        INSERT INTO organization_members (
          id, organization_id, user_id, role, is_primary, joined_at, created_at, updated_at
        )
        SELECT
          gen_random_uuid(),
          cs.organization_id,
          csm.user_id,
          csm.role,
          false,
          csm.created_at,
          NOW(),
          NOW()
        FROM cosmetics.cosmetics_store_members csm
        JOIN cosmetics.cosmetics_stores cs ON csm.store_id = cs.id
        WHERE cs.organization_id IS NOT NULL
          AND csm.is_active = true
          AND csm.role IN ('owner', 'manager')
          AND NOT EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = cs.organization_id AND om.user_id = csm.user_id
          )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove organization_members created by this migration
    await queryRunner.query(`
      DELETE FROM organization_members om
      USING cosmetics.cosmetics_stores cs
      WHERE om.organization_id = cs.organization_id
        AND cs.organization_id IS NOT NULL
    `);

    // Remove organization_id column
    const hasCol = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'cosmetics'
          AND table_name = 'cosmetics_stores'
          AND column_name = 'organization_id'
      ) AS exists
    `);
    if (hasCol[0]?.exists) {
      await queryRunner.query(`
        ALTER TABLE cosmetics.cosmetics_stores DROP COLUMN organization_id
      `);
    }

    // Remove organizations created for cosmetics stores
    await queryRunner.query(`
      DELETE FROM organizations
      WHERE metadata->>'serviceKey' = 'cosmetics'
    `);
  }
}
