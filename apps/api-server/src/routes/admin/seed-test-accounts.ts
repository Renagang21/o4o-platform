/**
 * WO-GLYCOPHARM-GLUCOSEVIEW-TEST-ACCOUNT-SEED-V1
 *
 * POST /api/v1/admin/seed-test-accounts
 *
 * 테스트 환자/약사 계정 생성 + service_memberships + role_assignments
 * Idempotent — 재실행 안전
 * Guard: requireAdmin (super_admin/admin only)
 */

import { Router, Request, Response } from 'express';
import { hashPassword } from '../../utils/auth.utils.js';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { requireAdmin } from '../../common/middleware/auth.middleware.js';
import AppDataSource from '../../database/data-source.js';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

interface TestAccount {
  email: string;
  name: string;
  membershipRole: string; // service_memberships.role
  assignedRole: string;   // role_assignments.role
}

const TEST_ACCOUNTS: TestAccount[] = [
  {
    email: 'patient_test@glycopharm.co.kr',
    name: '테스트 환자',
    membershipRole: 'customer',
    assignedRole: 'user',
  },
  {
    email: 'pharmacist_test@glycopharm.co.kr',
    name: '테스트 약국',
    membershipRole: 'pharmacy',
    assignedRole: 'pharmacy',
  },
];

const SERVICE_KEYS = ['glycopharm', 'glucoseview'];

router.post('/', async (_req: Request, res: Response): Promise<void> => {
  const logs: string[] = [];

  try {
    const hashedPassword = await hashPassword('O4oTestPass@1');

    for (const account of TEST_ACCOUNTS) {
      // 1. User (idempotent via ON CONFLICT)
      const userResult = await AppDataSource.query(
        `INSERT INTO users (id, email, password, name, status, "isActive", "isEmailVerified", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, 'active', true, true, NOW(), NOW())
         ON CONFLICT (email) DO UPDATE SET "updatedAt" = NOW()
         RETURNING id`,
        [account.email, hashedPassword, account.name]
      );
      const userId = userResult[0].id;
      logs.push(`[SEED] ${account.email} → user ${userId}`);

      // 2. ServiceMemberships (idempotent via UNIQUE(user_id, service_key))
      for (const serviceKey of SERVICE_KEYS) {
        await AppDataSource.query(
          `INSERT INTO service_memberships (id, user_id, service_key, status, role, approved_at, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, 'active', $3, NOW(), NOW(), NOW())
           ON CONFLICT (user_id, service_key) DO UPDATE SET status = 'active', role = $3, updated_at = NOW()`,
          [userId, serviceKey, account.membershipRole]
        );
        logs.push(`[SEED]   membership: ${serviceKey} (${account.membershipRole})`);
      }

      // 3. RoleAssignment (idempotent)
      await AppDataSource.query(
        `INSERT INTO role_assignments (id, user_id, role, is_active, valid_from, assigned_at, scope_type, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, true, NOW(), NOW(), 'global', NOW(), NOW())
         ON CONFLICT ON CONSTRAINT "unique_active_role_per_user" DO NOTHING`,
        [userId, account.assignedRole]
      );
      logs.push(`[SEED]   role: ${account.assignedRole}`);

      // 4. For pharmacy role: ensure organization + enrollment + membership
      if (account.assignedRole === 'pharmacy') {
        // 4a. Find or create organization for this pharmacist
        const existingOrg = await AppDataSource.query(
          `SELECT id FROM organizations WHERE created_by_user_id = $1 LIMIT 1`,
          [userId],
        );
        let orgId: string;

        if (existingOrg.length > 0) {
          orgId = existingOrg[0].id;
          logs.push(`[SEED]   org exists: ${orgId}`);
        } else {
          // Also check organization_members
          const memberOrg = await AppDataSource.query(
            `SELECT organization_id AS id FROM organization_members WHERE user_id = $1 AND left_at IS NULL LIMIT 1`,
            [userId],
          );

          if (memberOrg.length > 0) {
            orgId = memberOrg[0].id;
            logs.push(`[SEED]   org (via membership): ${orgId}`);
          } else {
            // Create a test pharmacy organization
            const orgCode = `TEST-SEED-${account.email.split('@')[0].toUpperCase()}`;
            const orgResult = await AppDataSource.query(
              `INSERT INTO organizations (id, name, code, type, level, path, "isActive", created_by_user_id, "createdAt", "updatedAt")
               VALUES (gen_random_uuid(), $1, $2, 'pharmacy', 0, $3, true, $4, NOW(), NOW())
               ON CONFLICT (code) DO UPDATE SET created_by_user_id = $4, "updatedAt" = NOW()
               RETURNING id`,
              [account.name, orgCode, `/${orgCode}`, userId],
            );
            orgId = orgResult[0].id;
            logs.push(`[SEED]   org created: ${orgId} (${orgCode})`);
          }
        }

        // 4b. Ensure organization_members record
        await AppDataSource.query(
          `INSERT INTO organization_members (id, organization_id, user_id, role, is_primary, joined_at, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, 'owner', true, NOW(), NOW(), NOW())
           ON CONFLICT ON CONSTRAINT "UQ_org_member_org_user" DO NOTHING`,
          [orgId, userId],
        );
        logs.push(`[SEED]   org_member: owner`);

        // 4c. Ensure glycopharm + glucoseview enrollments
        for (const svcCode of SERVICE_KEYS) {
          await AppDataSource.query(
            `INSERT INTO organization_service_enrollments (id, organization_id, service_code, status, enrolled_at, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, 'active', NOW(), NOW(), NOW())
             ON CONFLICT DO NOTHING`,
            [orgId, svcCode],
          );
        }
        logs.push(`[SEED]   enrollments: ${SERVICE_KEYS.join(', ')}`);
      }
    }

    res.json({ success: true, logs });
  } catch (error: any) {
    console.error('[SEED] Error:', error);
    res.status(500).json({ success: false, error: error.message, logs });
  }
});

export default router;
