/**
 * WO-ROLE-NORMALIZATION-PHASE3-B-V1
 *
 * Remove deprecated pharmacist_role and pharmacist_function columns from users.
 *
 * Prerequisites:
 * - 20260226200001-BackfillOrganizationMembersOwner already backfilled
 *   organization_members with 'owner' role from pharmacist_role = 'pharmacy_owner'
 * - 20260227000001-CreateKpaPharmacistProfiles already backfilled
 *   qualification data from kpa_members
 *
 * After this migration, pharmacistRole in API responses is computed from
 * organization_members (owner check) and kpa_pharmacist_profiles (activity_type).
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropUsersPharmacistColumns20260227000002
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // SAFETY GUARD: only drop columns if organization_members table exists.
    // derivePharmacistQualification() in auth.controller.ts depends on
    // organization_members. Without it, dropping these columns removes
    // the only source of pharmacist role data.
    const hasTable = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'organization_members'
      ) AS exists
    `);
    if (!hasTable[0]?.exists) {
      // eslint-disable-next-line no-console
      console.warn('[Migration] SKIPPED DropUsersPharmacistColumns: organization_members table not yet created');
      return;
    }

    await queryRunner.query(`
      ALTER TABLE users DROP COLUMN IF EXISTS pharmacist_role
    `);
    await queryRunner.query(`
      ALTER TABLE users DROP COLUMN IF EXISTS pharmacist_function
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS pharmacist_role VARCHAR(50) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS pharmacist_function VARCHAR(50) NULL
    `);
  }
}
