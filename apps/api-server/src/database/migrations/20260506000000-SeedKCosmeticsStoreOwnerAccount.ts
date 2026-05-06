/**
 * Migration: SeedKCosmeticsStoreOwnerAccount
 *
 * K-Cosmetics 매장 경영자 테스트 계정 생성
 *
 * Account:
 *   email: store-owner-k-cosmetics@o4o.com
 *   password: O4oTestPass
 *   role: cosmetics:store_owner
 *
 * 3-table 일관성:
 *   users (active) + service_memberships (k-cosmetics, store_owner) + role_assignments (cosmetics:store_owner)
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

// Pre-computed bcrypt hash for 'O4oTestPass' (salt rounds: 10)
const HASHED_PASSWORD = '$2a$10$3YjlNJQN4VC0r9g7UVYNz.dBw40P1mwo5ONt36NyvglEaJpEQWSQC';

const ACCOUNT = {
  email: 'store-owner-k-cosmetics@o4o.com',
  name: 'K-Cosmetics 매장 경영자',
  role: 'user',
};

export class SeedKCosmeticsStoreOwnerAccount20260506000000 implements MigrationInterface {
  name = 'SeedKCosmeticsStoreOwnerAccount20260506000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create user (idempotent)
    const existing = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1`,
      [ACCOUNT.email]
    );

    let userId: string;

    if (existing && existing.length > 0) {
      userId = existing[0].id;
      await queryRunner.query(
        `UPDATE users SET password = $1, status = 'active', "isActive" = true, "isEmailVerified" = true, "updatedAt" = NOW()
         WHERE id = $2`,
        [HASHED_PASSWORD, userId]
      );
      console.log(`  Updated existing account: ${ACCOUNT.email}`);
    } else {
      const inserted = await queryRunner.query(
        `INSERT INTO users (
          email, password, name, role, status,
          "isActive", "isEmailVerified", "loginAttempts",
          permissions, roles, "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, 'active',
          true, true, 0,
          '[]', $4, NOW(), NOW()
        ) RETURNING id`,
        [ACCOUNT.email, HASHED_PASSWORD, ACCOUNT.name, ACCOUNT.role]
      );
      userId = inserted[0].id;
      console.log(`  Created account: ${ACCOUNT.email}`);
    }

    // 2. Service membership (k-cosmetics, store_owner)
    await queryRunner.query(
      `INSERT INTO service_memberships (id, user_id, service_key, status, role, approved_at, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, 'k-cosmetics', 'active', 'store_owner', NOW(), NOW(), NOW())
       ON CONFLICT (user_id, service_key) DO UPDATE
         SET status = 'active', role = 'store_owner', approved_at = COALESCE(service_memberships.approved_at, NOW()), updated_at = NOW()`,
      [userId]
    );
    console.log(`  Upserted service_memberships: k-cosmetics / store_owner`);

    // 3. Role assignment (cosmetics:store_owner)
    await queryRunner.query(
      `INSERT INTO role_assignments (id, user_id, role, is_active, valid_from, assigned_at, scope_type, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, 'cosmetics:store_owner', true, NOW(), NOW(), 'global', NOW(), NOW())
       ON CONFLICT ON CONSTRAINT "unique_active_role_per_user" DO NOTHING`,
      [userId]
    );
    console.log(`  Upserted role_assignments: cosmetics:store_owner`);

    console.log('');
    console.log('=== K-Cosmetics Store Owner Account ===');
    console.log(`  Email   : ${ACCOUNT.email}`);
    console.log(`  Password: O4oTestPass`);
    console.log(`  Role    : cosmetics:store_owner`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE users SET status = 'inactive', "isActive" = false WHERE email = $1`,
      [ACCOUNT.email]
    );
    console.log(`Deactivated: ${ACCOUNT.email}`);
  }
}
