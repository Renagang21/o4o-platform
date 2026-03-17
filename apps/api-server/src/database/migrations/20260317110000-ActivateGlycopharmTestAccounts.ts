/**
 * ActivateGlycopharmTestAccounts
 *
 * 테스트 계정 2개 활성화:
 * - patient_test@glycopharm.co.kr (환자)
 * - pharmacist_test@glycopharm.co.kr (약사)
 *
 * 3-table 일관성: users(active) + service_memberships(active) + role_assignments
 */
import type { MigrationInterface, QueryRunner } from 'typeorm';

const ACCOUNTS = [
  {
    email: 'patient_test@glycopharm.co.kr',
    membershipRole: 'customer',
    assignedRole: 'user',
  },
  {
    email: 'pharmacist_test@glycopharm.co.kr',
    membershipRole: 'pharmacist',
    assignedRole: 'pharmacist',
  },
];

export class ActivateGlycopharmTestAccounts20260317110000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const account of ACCOUNTS) {
      // 1. Activate user
      await queryRunner.query(
        `UPDATE users SET status = 'active', "isActive" = true, "isEmailVerified" = true,
         "approvedAt" = COALESCE("approvedAt", NOW()), "updatedAt" = NOW()
         WHERE email = $1`,
        [account.email]
      );

      // 2. Get user ID
      const rows = await queryRunner.query(
        `SELECT id FROM users WHERE email = $1`,
        [account.email]
      );
      if (rows.length === 0) continue;
      const userId = rows[0].id;

      // 3. Activate service membership
      await queryRunner.query(
        `UPDATE service_memberships SET status = 'active', role = $1, approved_at = COALESCE(approved_at, NOW()), updated_at = NOW()
         WHERE user_id = $2 AND service_key = 'glycopharm'`,
        [account.membershipRole, userId]
      );

      // 4. Add glucoseview membership (if not exists)
      await queryRunner.query(
        `INSERT INTO service_memberships (id, user_id, service_key, status, role, approved_at, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, 'glucoseview', 'active', $2, NOW(), NOW(), NOW())
         ON CONFLICT (user_id, service_key) DO UPDATE SET status = 'active', role = $2, updated_at = NOW()`,
        [userId, account.membershipRole]
      );

      // 5. Role assignment (idempotent)
      await queryRunner.query(
        `INSERT INTO role_assignments (id, user_id, role, is_active, valid_from, assigned_at, scope_type, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, true, NOW(), NOW(), 'global', NOW(), NOW())
         ON CONFLICT ON CONSTRAINT "unique_active_role_per_user" DO NOTHING`,
        [userId, account.assignedRole]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const account of ACCOUNTS) {
      await queryRunner.query(
        `UPDATE users SET status = 'pending', "isActive" = false WHERE email = $1`,
        [account.email]
      );
    }
  }
}
