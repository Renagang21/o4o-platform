/**
 * WO-O4O-TEST-ACCOUNT-QUALIFICATION-AND-KCOS-STORE-OWNER-V1
 *
 * K-Cosmetics 매장 경영자 테스트 계정 생성.
 *
 * 생성 데이터:
 * - User: store-owner-kcosmetics@o4o.com
 * - service_memberships: k-cosmetics (store_owner)
 * - role_assignments: cosmetics:store_owner
 * - organizations: 테스트 K-Cosmetics 매장
 * - organization_members: owner
 * - organization_service_enrollments: cosmetics
 * - cosmetics.cosmetics_stores: approved store
 * - cosmetics.cosmetics_store_members: owner
 *
 * Idempotent: 재실행 안전 (ON CONFLICT)
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';
import bcrypt from 'bcryptjs';

const TEST_EMAIL = 'store-owner-kcosmetics@o4o.com';
const TEST_PASSWORD = 'O4oTestPass@1';
const TEST_NAME = '테스트 매장경영자';
const STORE_NAME = '테스트 K-Cosmetics 매장';
const STORE_CODE = 'TEST-KCOS-STORE-OWNER';
const STORE_SLUG = 'test-kcos-store-owner';
const SERVICE_KEY = 'k-cosmetics';

export class SeedKCosmeticsStoreOwnerTestAccount20260501100000 implements MigrationInterface {
  name = 'SeedKCosmeticsStoreOwnerTestAccount20260501100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

    // 1. User (idempotent via ON CONFLICT)
    const userResult = await queryRunner.query(
      `INSERT INTO users (id, email, password, name, status, "isActive", "isEmailVerified", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, 'active', true, true, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE SET "updatedAt" = NOW()
       RETURNING id`,
      [TEST_EMAIL, hashedPassword, TEST_NAME],
    );
    const userId = userResult[0].id;
    console.log(`[SeedKCosStoreOwner] user: ${userId}`);

    // 2. service_memberships (idempotent via UNIQUE(user_id, service_key))
    await queryRunner.query(
      `INSERT INTO service_memberships (id, user_id, service_key, status, role, approved_at, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'active', 'store_owner', NOW(), NOW(), NOW())
       ON CONFLICT (user_id, service_key) DO UPDATE SET status = 'active', role = 'store_owner', updated_at = NOW()`,
      [userId, SERVICE_KEY],
    );
    console.log(`[SeedKCosStoreOwner] membership: ${SERVICE_KEY} (store_owner)`);

    // 3. role_assignments (idempotent)
    await queryRunner.query(
      `INSERT INTO role_assignments (id, user_id, role, is_active, valid_from, assigned_at, scope_type, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, 'cosmetics:store_owner', true, NOW(), NOW(), 'global', NOW(), NOW())
       ON CONFLICT ON CONSTRAINT "unique_active_role_per_user" DO NOTHING`,
      [userId],
    );
    console.log(`[SeedKCosStoreOwner] role: cosmetics:store_owner`);

    // 4. Organization (idempotent via UNIQUE code)
    const orgResult = await queryRunner.query(
      `INSERT INTO organizations (id, name, code, type, level, path, "isActive", metadata, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'store', 0, $3, true, $4, NOW(), NOW())
       ON CONFLICT (code) DO UPDATE SET "updatedAt" = NOW()
       RETURNING id`,
      [STORE_NAME, STORE_CODE, `/${STORE_CODE}`, JSON.stringify({ serviceKey: 'cosmetics' })],
    );
    const orgId = orgResult[0].id;
    console.log(`[SeedKCosStoreOwner] org: ${orgId}`);

    // 5. organization_members (idempotent)
    await queryRunner.query(
      `INSERT INTO organization_members (id, organization_id, user_id, role, is_primary, joined_at, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'owner', true, NOW(), NOW(), NOW())
       ON CONFLICT ON CONSTRAINT "UQ_org_member_org_user" DO NOTHING`,
      [orgId, userId],
    );
    console.log(`[SeedKCosStoreOwner] org_member: owner`);

    // 6. organization_service_enrollments (idempotent)
    await queryRunner.query(
      `INSERT INTO organization_service_enrollments (id, organization_id, service_code, status, enrolled_at, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, 'cosmetics', 'active', NOW(), NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [orgId],
    );
    console.log(`[SeedKCosStoreOwner] enrollment: cosmetics`);

    // 7. cosmetics.cosmetics_stores (idempotent via UNIQUE code)
    const storeResult = await queryRunner.query(
      `INSERT INTO cosmetics.cosmetics_stores (id, name, code, slug, business_number, owner_name, status, organization_id, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 'TEST-0000-0000', $4, 'approved', $5, NOW(), NOW())
       ON CONFLICT (code) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
      [STORE_NAME, STORE_CODE, STORE_SLUG, TEST_NAME, orgId],
    );
    const storeId = storeResult[0].id;
    console.log(`[SeedKCosStoreOwner] store: ${storeId}`);

    // 8. cosmetics.cosmetics_store_members (idempotent via UNIQUE(store_id, user_id))
    await queryRunner.query(
      `INSERT INTO cosmetics.cosmetics_store_members (id, store_id, user_id, role, is_active, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'owner', true, NOW(), NOW())
       ON CONFLICT ON CONSTRAINT "UQ_cosmetics_store_members_storeId_userId" DO NOTHING`,
      [storeId, userId],
    );
    console.log(`[SeedKCosStoreOwner] store_member: owner`);

    // 9. platform_store_slug_history (slug registry, idempotent)
    await queryRunner.query(
      `INSERT INTO platform_store_slug_history (id, store_id, service_key, slug, is_current, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, 'cosmetics', $2, true, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [storeId, STORE_SLUG],
    );
    console.log(`[SeedKCosStoreOwner] slug: ${STORE_SLUG}`);

    console.log(`[SeedKCosStoreOwner] Done: ${TEST_EMAIL} → cosmetics:store_owner + store "${STORE_NAME}"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Test account removal — reverse order
    const users = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [TEST_EMAIL],
    );
    if (users.length === 0) return;

    const userId = users[0].id;

    // Delete store member, store, slug, enrollment, org member, org, role, membership, user
    await queryRunner.query(`DELETE FROM cosmetics.cosmetics_store_members WHERE user_id = $1`, [userId]);
    await queryRunner.query(`DELETE FROM cosmetics.cosmetics_stores WHERE code = $1`, [STORE_CODE]);
    await queryRunner.query(`DELETE FROM platform_store_slug_history WHERE slug = $1 AND service_key = 'cosmetics'`, [STORE_SLUG]);
    await queryRunner.query(`DELETE FROM organization_service_enrollments WHERE organization_id IN (SELECT id FROM organizations WHERE code = $1)`, [STORE_CODE]);
    await queryRunner.query(`DELETE FROM organization_members WHERE user_id = $1`, [userId]);
    await queryRunner.query(`DELETE FROM organizations WHERE code = $1`, [STORE_CODE]);
    await queryRunner.query(`DELETE FROM role_assignments WHERE user_id = $1 AND role = 'cosmetics:store_owner'`, [userId]);
    await queryRunner.query(`DELETE FROM service_memberships WHERE user_id = $1 AND service_key = $2`, [userId, SERVICE_KEY]);
    await queryRunner.query(`DELETE FROM users WHERE id = $1`, [userId]);

    console.log(`[SeedKCosStoreOwner] Rolled back: ${TEST_EMAIL}`);
  }
}
