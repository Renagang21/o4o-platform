/**
 * WO-O4O-COSMETICS-STORE-HUB-ADOPTION-V1
 *
 * Bridge cosmetics_stores → organizations for Store HUB integration.
 *
 * 0. Create organization_members table (was only created by synchronize:true)
 * 0b. Fix organization_channels FK: kpa_organizations → organizations
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
    // ============================================================
    // 0. Create organization_members table (IF NOT EXISTS)
    //
    // This table was previously only created by TypeORM synchronize:true.
    // Column naming: snake_case (matches all raw SQL throughout codebase).
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS organization_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        user_id UUID NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'member',
        is_primary BOOLEAN NOT NULL DEFAULT false,
        metadata JSONB,
        joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
        left_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "UQ_org_member_org_user" UNIQUE (organization_id, user_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_org_member_user_id" ON organization_members (user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_org_member_org_id" ON organization_members (organization_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_org_member_is_primary" ON organization_members (is_primary)`);

    // ============================================================
    // 0b. Fix organization_channels FK: kpa_organizations → organizations
    //
    // The original migration (20260215200001) created FK to kpa_organizations,
    // but after Org Service Model Normalization, organizations is the canonical table.
    // GlycoPharm/Cosmetics channels require FK to organizations.
    // ============================================================
    const hasChannelsTable = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'organization_channels'
      ) AS exists
    `);
    if (hasChannelsTable[0]?.exists) {
      // Drop old FK if it exists (references kpa_organizations)
      await queryRunner.query(`
        ALTER TABLE organization_channels
          DROP CONSTRAINT IF EXISTS "FK_org_channel_organization"
      `);
      // Add new FK to organizations (if not already present)
      const hasNewFk = await queryRunner.query(`
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'FK_org_channel_organizations'
          AND table_name = 'organization_channels'
      `);
      if (hasNewFk.length === 0) {
        await queryRunner.query(`
          ALTER TABLE organization_channels
            ADD CONSTRAINT "FK_org_channel_organizations"
            FOREIGN KEY (organization_id) REFERENCES organizations(id)
            ON DELETE RESTRICT ON UPDATE CASCADE
        `);
      }
    }

    // Guard: skip cosmetics bridge if cosmetics_stores table does not exist
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
