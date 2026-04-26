import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-OWNER-LEGACY-CLEANUP-V1 — Phase 1
 *
 * Migrate residual `k-cosmetics:seller` role_assignments → `cosmetics:store_owner`.
 *
 * Background: BackfillStoreOwnerRoles20260900000000 looked for `role = 'seller'`
 * (the format produced by UnifyCosmeticsRolesCatalog). One user has the legacy
 * `k-cosmetics:seller` format, which was missed. This migration handles that case.
 *
 * Also normalizes any service_memberships rows still using legacy seller formats.
 */
export class CleanupKCosmeticsSellerRole20260901000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const raResult = await queryRunner.query(`
      UPDATE role_assignments
      SET role = 'cosmetics:store_owner', updated_at = NOW()
      WHERE role IN ('k-cosmetics:seller', 'cosmetics:seller')
        AND is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM role_assignments ra2
          WHERE ra2.user_id = role_assignments.user_id
            AND ra2.role = 'cosmetics:store_owner'
            AND ra2.is_active = true
        )
    `);
    console.log(`[Migration] role_assignments k-cosmetics:seller → cosmetics:store_owner: ${raResult[1] ?? 0} updated`);

    await queryRunner.query(`
      UPDATE role_assignments
      SET is_active = false, updated_at = NOW()
      WHERE role IN ('k-cosmetics:seller', 'cosmetics:seller', 'seller')
        AND is_active = true
    `);

    const smResult = await queryRunner.query(`
      UPDATE service_memberships
      SET role = 'cosmetics:store_owner', updated_at = NOW()
      WHERE role IN ('k-cosmetics:seller', 'cosmetics:seller', 'seller')
        AND service_key = 'k-cosmetics'
    `);
    console.log(`[Migration] service_memberships seller variants → cosmetics:store_owner: ${smResult[1] ?? 0} updated`);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op: legacy format restoration is not desired
  }
}
