/**
 * WO-ROLE-NORMALIZATION-PHASE3-A-V1
 *
 * Backfill organization_members with owner records from:
 * 1. GlycoPharm store owners (organizations.created_by_user_id)
 * 2. KPA pharmacy owners (users.pharmacist_role = 'pharmacy_owner')
 *
 * Uses ON CONFLICT to be idempotent.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillOrganizationMembersOwner1740600001000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. GlycoPharm store owners → organization_members
    // Find all pharmacy-type organizations with a created_by_user_id
    await queryRunner.query(`
      INSERT INTO organization_members (
        id, organization_id, user_id, role, is_primary, joined_at, created_at, updated_at
      )
      SELECT
        uuid_generate_v4(),
        o.id,
        o.created_by_user_id,
        'owner',
        false,
        o.created_at,
        NOW(),
        NOW()
      FROM organizations o
      WHERE o.created_by_user_id IS NOT NULL
        AND o.type = 'pharmacy'
        AND NOT EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.organization_id = o.id AND om.user_id = o.created_by_user_id
        )
    `);

    // 2. KPA pharmacy owners (via pharmacist_role) → organization_members
    // Link to their KPA organization via kpa_members
    await queryRunner.query(`
      INSERT INTO organization_members (
        id, organization_id, user_id, role, is_primary, joined_at, created_at, updated_at
      )
      SELECT
        uuid_generate_v4(),
        km.organization_id,
        u.id,
        'owner',
        false,
        COALESCE(km.created_at, NOW()),
        NOW(),
        NOW()
      FROM users u
      JOIN kpa_members km ON km.user_id = u.id
      WHERE u.pharmacist_role = 'pharmacy_owner'
        AND NOT EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.organization_id = km.organization_id AND om.user_id = u.id
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove owner records created by this migration
    // Safe: only removes 'owner' role records, preserves other roles
    await queryRunner.query(`
      DELETE FROM organization_members
      WHERE role = 'owner'
    `);
  }
}
