/**
 * Role Audit Script
 *
 * WO-P1-SERVICE-ROLE-PREFIX-IMPLEMENTATION-V1 - Phase 0
 *
 * Scans all users in the database and generates a comprehensive report
 * showing current role usage, migration status, and recommendations.
 *
 * Usage:
 *   tsx src/scripts/audit-roles.ts
 *
 * Output:
 *   - Console report with statistics
 *   - Optional JSON file with detailed data
 */

import 'reflect-metadata';
import { AppDataSource } from '../database/connection.js';
import { User } from '../modules/auth/entities/User.js';
import { getRoleMigrationStatus, isPrefixedRole } from '../utils/role.utils.js';
import type { ServiceKey } from '../types/roles.js';

interface RoleAuditResult {
  totalUsers: number;
  usersWithRoles: number;
  usersWithoutRoles: number;
  totalRoles: number;
  uniqueLegacyRoles: Set<string>;
  uniquePrefixedRoles: Set<string>;
  roleDistribution: Record<string, number>;
  serviceDistribution: Record<ServiceKey | 'none', number>;
  migrationStatus: {
    fullyMigrated: number;
    partiallyMigrated: number;
    notMigrated: number;
  };
  usersByService: Record<ServiceKey | 'none', number>;
}

async function auditRoles(): Promise<RoleAuditResult> {
  console.log('🔍 Starting role audit...\n');

  // Initialize data source
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const userRepo = AppDataSource.getRepository(User);

  // Fetch all users with their roles
  const allUsers = await userRepo.find({
    select: ['id', 'email', 'roles', 'serviceKey']
  });

  console.log(`📊 Found ${allUsers.length} total users\n`);

  // Initialize audit result
  const result: RoleAuditResult = {
    totalUsers: allUsers.length,
    usersWithRoles: 0,
    usersWithoutRoles: 0,
    totalRoles: 0,
    uniqueLegacyRoles: new Set(),
    uniquePrefixedRoles: new Set(),
    roleDistribution: {},
    serviceDistribution: {
      platform: 0,
      kpa: 0,
      neture: 0,
      glycopharm: 0,
      cosmetics: 0,
      glucoseview: 0,
      none: 0
    },
    migrationStatus: {
      fullyMigrated: 0,
      partiallyMigrated: 0,
      notMigrated: 0
    },
    usersByService: {
      platform: 0,
      kpa: 0,
      neture: 0,
      glycopharm: 0,
      cosmetics: 0,
      glucoseview: 0,
      none: 0
    }
  };

  // Analyze each user
  for (const user of allUsers) {
    const userRoles = user.roles || [];
    const serviceKey = (user.serviceKey || 'none') as ServiceKey | 'none';

    // Count users by service
    result.usersByService[serviceKey]++;

    // Check if user has roles
    if (userRoles.length === 0) {
      result.usersWithoutRoles++;
      continue;
    }

    result.usersWithRoles++;
    result.totalRoles += userRoles.length;

    // Analyze each role
    for (const role of userRoles) {
      // Track role distribution
      result.roleDistribution[role] = (result.roleDistribution[role] || 0) + 1;

      // Categorize as legacy or prefixed
      if (isPrefixedRole(role)) {
        result.uniquePrefixedRoles.add(role);

        // Track service distribution from prefixed roles
        const service = role.split(':')[0] as ServiceKey;
        if (service in result.serviceDistribution) {
          result.serviceDistribution[service]++;
        }
      } else {
        result.uniqueLegacyRoles.add(role);
        result.serviceDistribution.none++;
      }
    }

    // Check migration status for this user
    const migrationStatus = getRoleMigrationStatus(userRoles);
    if (migrationStatus.migrationComplete) {
      result.migrationStatus.fullyMigrated++;
    } else if (migrationStatus.prefixed > 0) {
      result.migrationStatus.partiallyMigrated++;
    } else {
      result.migrationStatus.notMigrated++;
    }
  }

  return result;
}

function printAuditReport(result: RoleAuditResult): void {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    ROLE AUDIT REPORT                         ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // User Statistics
  console.log('📊 USER STATISTICS');
  console.log('─────────────────────────────────────────────────────────────');
  console.log(`Total Users:              ${result.totalUsers}`);
  console.log(`Users with Roles:         ${result.usersWithRoles}`);
  console.log(`Users without Roles:      ${result.usersWithoutRoles}`);
  console.log(`Total Role Assignments:   ${result.totalRoles}\n`);

  // Users by Service
  console.log('👥 USERS BY SERVICE');
  console.log('─────────────────────────────────────────────────────────────');
  for (const [service, count] of Object.entries(result.usersByService)) {
    if (count > 0) {
      console.log(`${service.padEnd(15)}: ${count}`);
    }
  }
  console.log();

  // Role Format Statistics
  console.log('🏷️  ROLE FORMAT STATISTICS');
  console.log('─────────────────────────────────────────────────────────────');
  console.log(`Unique Legacy Roles:      ${result.uniqueLegacyRoles.size}`);
  console.log(`Unique Prefixed Roles:    ${result.uniquePrefixedRoles.size}`);
  console.log(`Total Unique Roles:       ${result.uniqueLegacyRoles.size + result.uniquePrefixedRoles.size}\n`);

  // Legacy Roles Breakdown
  if (result.uniqueLegacyRoles.size > 0) {
    console.log('❌ LEGACY ROLES (Need Migration):');
    console.log('─────────────────────────────────────────────────────────────');
    const sortedLegacy = Array.from(result.uniqueLegacyRoles).sort();
    for (const role of sortedLegacy) {
      const count = result.roleDistribution[role] || 0;
      console.log(`  ${role.padEnd(25)} (${count} users)`);
    }
    console.log();
  }

  // Prefixed Roles Breakdown
  if (result.uniquePrefixedRoles.size > 0) {
    console.log('✅ PREFIXED ROLES (Migrated):');
    console.log('─────────────────────────────────────────────────────────────');
    const sortedPrefixed = Array.from(result.uniquePrefixedRoles).sort();
    for (const role of sortedPrefixed) {
      const count = result.roleDistribution[role] || 0;
      console.log(`  ${role.padEnd(25)} (${count} users)`);
    }
    console.log();
  }

  // Migration Status
  console.log('📈 MIGRATION STATUS');
  console.log('─────────────────────────────────────────────────────────────');
  const totalWithRoles = result.usersWithRoles;
  const fullyPct = totalWithRoles > 0
    ? ((result.migrationStatus.fullyMigrated / totalWithRoles) * 100).toFixed(1)
    : '0.0';
  const partialPct = totalWithRoles > 0
    ? ((result.migrationStatus.partiallyMigrated / totalWithRoles) * 100).toFixed(1)
    : '0.0';
  const notPct = totalWithRoles > 0
    ? ((result.migrationStatus.notMigrated / totalWithRoles) * 100).toFixed(1)
    : '0.0';

  console.log(`Fully Migrated:           ${result.migrationStatus.fullyMigrated} (${fullyPct}%)`);
  console.log(`Partially Migrated:       ${result.migrationStatus.partiallyMigrated} (${partialPct}%)`);
  console.log(`Not Migrated:             ${result.migrationStatus.notMigrated} (${notPct}%)\n`);

  // Service Distribution
  console.log('🔑 ROLE ASSIGNMENTS BY SERVICE');
  console.log('─────────────────────────────────────────────────────────────');
  for (const [service, count] of Object.entries(result.serviceDistribution)) {
    if (count > 0) {
      console.log(`${service.padEnd(15)}: ${count} role assignments`);
    }
  }
  console.log();

  // Recommendations
  console.log('💡 RECOMMENDATIONS');
  console.log('─────────────────────────────────────────────────────────────');

  if (result.migrationStatus.notMigrated === totalWithRoles && totalWithRoles > 0) {
    console.log('⚠️  No users have been migrated yet.');
    console.log('   Next step: Begin Phase 1 (KPA-Society) migration.');
  } else if (result.migrationStatus.fullyMigrated === totalWithRoles && totalWithRoles > 0) {
    console.log('✅ All users have been fully migrated!');
    console.log('   Next step: Proceed to Phase 7 (Cleanup).');
  } else {
    console.log('🔄 Migration in progress.');
    console.log(`   ${result.migrationStatus.notMigrated} users still need migration.`);
    console.log(`   ${result.migrationStatus.partiallyMigrated} users are partially migrated.`);
  }

  // Top legacy roles to migrate
  if (result.uniqueLegacyRoles.size > 0) {
    console.log('\n📋 TOP LEGACY ROLES TO MIGRATE:');
    const legacyRoleCounts = Array.from(result.uniqueLegacyRoles)
      .map(role => ({ role, count: result.roleDistribution[role] || 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    for (const { role, count } of legacyRoleCounts) {
      console.log(`   ${role.padEnd(25)} → Affects ${count} users`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

// Main execution
async function main() {
  try {
    const result = await auditRoles();
    printAuditReport(result);

    // Optionally write to JSON file
    const fs = await import('fs/promises');
    const outputPath = 'role-audit-report.json';

    const jsonOutput = {
      timestamp: new Date().toISOString(),
      summary: {
        totalUsers: result.totalUsers,
        usersWithRoles: result.usersWithRoles,
        usersWithoutRoles: result.usersWithoutRoles,
        totalRoles: result.totalRoles,
        uniqueLegacyRoles: result.uniqueLegacyRoles.size,
        uniquePrefixedRoles: result.uniquePrefixedRoles.size
      },
      legacyRoles: Array.from(result.uniqueLegacyRoles).sort(),
      prefixedRoles: Array.from(result.uniquePrefixedRoles).sort(),
      roleDistribution: result.roleDistribution,
      serviceDistribution: result.serviceDistribution,
      migrationStatus: result.migrationStatus,
      usersByService: result.usersByService
    };

    await fs.writeFile(outputPath, JSON.stringify(jsonOutput, null, 2));
    console.log(`📄 Detailed report saved to: ${outputPath}\n`);

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during role audit:', error);
    await AppDataSource.destroy();
    process.exit(1);
  }
}

main();
