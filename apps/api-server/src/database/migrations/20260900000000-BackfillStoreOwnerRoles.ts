import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-OWNER-ROLE-BASED-ACCESS-UNIFICATION-V1 — Phase 1
 *
 * Backfill store_owner roles into role_assignments for existing approved store owners.
 *
 * 1. KPA:        kpa:store_owner        ← org_members(owner) ∪ kpa_pharmacist_profiles(pharmacy_owner)
 * 2. GlycoPharm: glycopharm:store_owner  ← glycopharm_members(sub_role=pharmacy_owner, status=approved)
 * 3. K-Cosmetics: seller → cosmetics:store_owner  ← role_assignments(seller) ∩ service_memberships(k-cosmetics)
 *
 * Also adds catalog entries to `roles` table for the new store_owner roles.
 */
export class BackfillStoreOwnerRoles20260900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 0. Add roles catalog entries (idempotent) ──
    await queryRunner.query(`
      INSERT INTO roles (name, display_name, description, service_key, role_key, is_system, is_admin_role, is_assignable, is_active)
      VALUES
        ('kpa:store_owner', 'Store Owner', 'KPA pharmacy store owner', 'kpa', 'store_owner', false, false, true, true),
        ('glycopharm:store_owner', 'Store Owner', 'GlycoPharm pharmacy store owner', 'glycopharm', 'store_owner', false, false, true, true),
        ('cosmetics:store_owner', 'Store Owner', 'K-Cosmetics store owner', 'cosmetics', 'store_owner', false, false, true, true)
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('[Migration] roles catalog: added kpa:store_owner, glycopharm:store_owner, cosmetics:store_owner');

    // ── 1. KPA: kpa:store_owner ──
    // Source A: organization_members with role='owner' AND kpa-society membership
    // Source B: kpa_pharmacist_profiles with activity_type='pharmacy_owner'
    const kpaResult = await queryRunner.query(`
      INSERT INTO role_assignments (user_id, role, is_active, valid_from, assigned_at, scope_type, created_at, updated_at)
      SELECT DISTINCT sub.user_id, 'kpa:store_owner', true, NOW(), NOW(), 'global', NOW(), NOW()
      FROM (
        SELECT om.user_id
        FROM organization_members om
        JOIN service_memberships sm ON sm.user_id = om.user_id AND sm.service_key = 'kpa-society'
        WHERE om.role = 'owner' AND om.left_at IS NULL

        UNION

        SELECT kpp.user_id
        FROM kpa_pharmacist_profiles kpp
        JOIN service_memberships sm ON sm.user_id = kpp.user_id AND sm.service_key = 'kpa-society'
        WHERE kpp.activity_type = 'pharmacy_owner'
      ) sub
      ON CONFLICT ON CONSTRAINT unique_active_role_per_user DO NOTHING
    `);
    console.log(`[Migration] KPA kpa:store_owner backfill: ${kpaResult[1] ?? 0} rows inserted`);

    // ── 2. GlycoPharm: glycopharm:store_owner ──
    // Source: glycopharm_members with sub_role='pharmacy_owner' AND status='approved'
    await queryRunner.query('SAVEPOINT glyco_backfill');
    try {
      const glycoResult = await queryRunner.query(`
        INSERT INTO role_assignments (user_id, role, is_active, valid_from, assigned_at, scope_type, created_at, updated_at)
        SELECT gm.user_id, 'glycopharm:store_owner', true, NOW(), NOW(), 'global', NOW(), NOW()
        FROM glycopharm_members gm
        WHERE gm.sub_role = 'pharmacy_owner'
          AND gm.status = 'approved'
          AND gm.deleted_at IS NULL
        ON CONFLICT ON CONSTRAINT unique_active_role_per_user DO NOTHING
      `);
      console.log(`[Migration] GlycoPharm glycopharm:store_owner backfill: ${glycoResult[1] ?? 0} rows inserted`);
      await queryRunner.query('RELEASE SAVEPOINT glyco_backfill');
    } catch (e: any) {
      console.warn(`[Migration] GlycoPharm backfill skipped (table may not exist): ${e.message}`);
      await queryRunner.query('ROLLBACK TO SAVEPOINT glyco_backfill');
    }

    // ── 3. K-Cosmetics: seller → cosmetics:store_owner ──
    // Current state: role='seller' in role_assignments for k-cosmetics users
    // (after UnifyCosmeticsRolesCatalog migration renamed cosmetics:seller → seller)
    const cosRaResult = await queryRunner.query(`
      UPDATE role_assignments ra
      SET role = 'cosmetics:store_owner', updated_at = NOW()
      FROM service_memberships sm
      WHERE sm.user_id = ra.user_id
        AND sm.service_key = 'k-cosmetics'
        AND ra.role = 'seller'
        AND ra.is_active = true
    `);
    console.log(`[Migration] K-Cosmetics role_assignments seller → cosmetics:store_owner: ${cosRaResult[1] ?? 0} rows updated`);

    // Also update service_memberships role for consistency
    const cosSmResult = await queryRunner.query(`
      UPDATE service_memberships SET role = 'cosmetics:store_owner', updated_at = NOW()
      WHERE role = 'seller' AND service_key = 'k-cosmetics'
    `);
    console.log(`[Migration] K-Cosmetics service_memberships seller → cosmetics:store_owner: ${cosSmResult[1] ?? 0} rows updated`);

    // Remove old 'seller' catalog entry (cosmetics:store_owner already created in Section 0)
    const cosRolesResult = await queryRunner.query(`
      DELETE FROM roles WHERE name = 'seller' AND service_key = 'cosmetics'
    `);
    console.log(`[Migration] K-Cosmetics roles catalog: removed old 'seller' entry: ${cosRolesResult[1] ?? 0} rows deleted`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove KPA store_owner roles
    await queryRunner.query(`
      DELETE FROM role_assignments WHERE role = 'kpa:store_owner' AND is_active = true
    `);

    // Remove GlycoPharm store_owner roles
    await queryRunner.query(`
      DELETE FROM role_assignments WHERE role = 'glycopharm:store_owner' AND is_active = true
    `);

    // Revert K-Cosmetics: cosmetics:store_owner → seller
    await queryRunner.query(`
      UPDATE role_assignments ra SET role = 'seller', updated_at = NOW()
      FROM service_memberships sm
      WHERE sm.user_id = ra.user_id AND sm.service_key = 'k-cosmetics'
        AND ra.role = 'cosmetics:store_owner' AND ra.is_active = true
    `);
    await queryRunner.query(`
      UPDATE service_memberships SET role = 'seller', updated_at = NOW()
      WHERE role = 'cosmetics:store_owner' AND service_key = 'k-cosmetics'
    `);
    // Recreate old 'seller' catalog entry
    await queryRunner.query(`
      INSERT INTO roles (name, display_name, description, service_key, role_key, is_system, is_admin_role, is_assignable, is_active)
      VALUES ('seller', 'Seller', 'K-Cosmetics seller/retailer', 'cosmetics', 'seller', false, false, true, true)
      ON CONFLICT (name) DO NOTHING
    `);

    // Remove new catalog entries
    await queryRunner.query(`
      DELETE FROM roles WHERE name IN ('kpa:store_owner', 'glycopharm:store_owner', 'cosmetics:store_owner')
    `);
  }
}
