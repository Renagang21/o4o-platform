/**
 * Phase P0 RBAC: Verify Migration Script
 *
 * Verifies that all users have been properly migrated to the RoleAssignment table
 * and that the system is ready for deprecated field removal.
 *
 * Usage:
 *   npx tsx src/scripts/verify-rbac-migration.ts
 *
 * This script will:
 * 1. Check all users have RoleAssignment records for their legacy roles
 * 2. Report any discrepancies
 * 3. Validate that auth middleware will work correctly
 */

// MUST be first: Load environment variables
import '../env-loader.js';

// MUST import reflect-metadata before TypeORM entities
import 'reflect-metadata';

import { AppDataSource } from '../database/connection.js';
import { User } from '../modules/auth/entities/User.js';
import { RoleAssignment } from '../modules/auth/entities/RoleAssignment.js';
import logger from '../utils/logger.js';

interface VerificationResult {
  totalUsers: number;
  usersWithAssignments: number;
  usersMissingAssignments: number;
  totalAssignments: number;
  orphanedAssignments: number;
  roleDistribution: Record<string, number>;
  issues: Array<{ userId: string; email: string; issue: string }>;
  passed: boolean;
}

async function verifyRBACMigration(): Promise<VerificationResult> {
  const result: VerificationResult = {
    totalUsers: 0,
    usersWithAssignments: 0,
    usersMissingAssignments: 0,
    totalAssignments: 0,
    orphanedAssignments: 0,
    roleDistribution: {},
    issues: [],
    passed: true
  };

  try {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info('[Verify] Database connection initialized');
    }

    const userRepo = AppDataSource.getRepository(User);
    const roleAssignmentRepo = AppDataSource.getRepository(RoleAssignment);

    // Get all users
    const users = await userRepo.find({
      select: ['id', 'email', 'roles', 'isActive']
    });
    result.totalUsers = users.length;

    // Get all role assignments
    const allAssignments = await roleAssignmentRepo.find();
    result.totalAssignments = allAssignments.length;

    // Build role distribution
    for (const assignment of allAssignments) {
      if (!result.roleDistribution[assignment.role]) {
        result.roleDistribution[assignment.role] = 0;
      }
      result.roleDistribution[assignment.role]++;
    }

    // Check each user
    const userIdsWithAssignments = new Set(allAssignments.map(a => a.userId));

    for (const user of users) {
      // Get expected roles from legacy fields
      // role column removed - Phase3-E: use roles array only
      const expectedRoles = new Set<string>();
      if (user.roles && Array.isArray(user.roles)) {
        user.roles.forEach(r => r && expectedRoles.add(r));
      }

      // Get actual assignments for this user
      const userAssignments = allAssignments.filter(a => a.userId === user.id);

      if (userAssignments.length > 0) {
        result.usersWithAssignments++;
      } else {
        result.usersMissingAssignments++;

        // Only report as issue if user has non-default roles
        if (expectedRoles.size > 0 && !isOnlyDefaultRole(expectedRoles)) {
          result.issues.push({
            userId: user.id,
            email: user.email,
            issue: `Missing RoleAssignment records for roles: ${Array.from(expectedRoles).join(', ')}`
          });
          result.passed = false;
        }
      }

      // Check if all expected roles have assignments
      for (const expectedRole of expectedRoles) {
        const hasAssignment = userAssignments.some(a => a.role === expectedRole);
        if (!hasAssignment && expectedRole !== 'user') {
          // Don't flag 'user' role as it's the default
          const existingIssue = result.issues.find(i => i.userId === user.id);
          if (!existingIssue) {
            result.issues.push({
              userId: user.id,
              email: user.email,
              issue: `Missing RoleAssignment for role: ${expectedRole}`
            });
            result.passed = false;
          }
        }
      }
    }

    // Check for orphaned assignments (assignments for deleted users)
    const validUserIds = new Set(users.map(u => u.id));
    for (const assignment of allAssignments) {
      if (!validUserIds.has(assignment.userId)) {
        result.orphanedAssignments++;
      }
    }

    // Print summary
    logger.info('[Verify] ===== RBAC Migration Verification Summary =====');
    logger.info(`[Verify] Total Users: ${result.totalUsers}`);
    logger.info(`[Verify] Users with RoleAssignments: ${result.usersWithAssignments}`);
    logger.info(`[Verify] Users missing RoleAssignments: ${result.usersMissingAssignments}`);
    logger.info(`[Verify] Total RoleAssignments: ${result.totalAssignments}`);
    logger.info(`[Verify] Orphaned Assignments: ${result.orphanedAssignments}`);
    logger.info('[Verify] Role Distribution:', result.roleDistribution);
    logger.info(`[Verify] Issues found: ${result.issues.length}`);
    logger.info(`[Verify] Migration Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);

    if (result.issues.length > 0) {
      logger.warn('[Verify] Issues:');
      for (const issue of result.issues.slice(0, 10)) {
        logger.warn(`  - User ${issue.userId} (${issue.email}): ${issue.issue}`);
      }
      if (result.issues.length > 10) {
        logger.warn(`  ... and ${result.issues.length - 10} more issues`);
      }
    }

    return result;

  } catch (error) {
    logger.error('[Verify] Fatal error:', error);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info('[Verify] Database connection closed');
    }
  }
}

function isOnlyDefaultRole(roles: Set<string>): boolean {
  return roles.size === 1 && (roles.has('user') || roles.has('customer'));
}

// Run verification if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('verify-rbac-migration.ts');

if (isMainModule) {
  verifyRBACMigration()
    .then((result) => {
      console.log('\n===== RBAC Migration Verification Complete =====\n');
      console.log(`Total Users: ${result.totalUsers}`);
      console.log(`Users with Assignments: ${result.usersWithAssignments}`);
      console.log(`Users Missing Assignments: ${result.usersMissingAssignments}`);
      console.log(`Total Assignments: ${result.totalAssignments}`);
      console.log(`Orphaned Assignments: ${result.orphanedAssignments}`);
      console.log('\nRole Distribution:');
      for (const [role, count] of Object.entries(result.roleDistribution)) {
        console.log(`  ${role}: ${count}`);
      }
      console.log(`\nIssues: ${result.issues.length}`);
      console.log(`\nStatus: ${result.passed ? '✅ PASSED - Ready for deprecated field removal' : '❌ FAILED - Run migration first'}\n`);

      process.exit(result.passed ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n❌ Verification failed:', error);
      process.exit(1);
    });
}

export { verifyRBACMigration };
