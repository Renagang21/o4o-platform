#!/usr/bin/env ts-node
/**
 * Migrate User Roles to Database
 *
 * This script migrates existing user roles from the legacy user.role column
 * to the new database-driven user_roles table.
 *
 * Usage:
 * ts-node scripts/migrate-user-roles.ts
 */

import 'reflect-metadata';
import { AppDataSource } from '../src/database/connection';
import { User } from '../src/entities/User';
import { Role } from '../src/entities/Role';

async function migrateUserRoles() {
  try {
    console.log('🚀 Starting user roles migration...\n');

    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connection initialized\n');
    }

    const userRepository = AppDataSource.getRepository(User);
    const roleRepository = AppDataSource.getRepository(Role);

    // Get all users
    console.log('📋 Fetching all users...');
    const users = await userRepository.find();
    console.log(`✅ Found ${users.length} users\n`);

    // Get all roles
    console.log('📋 Fetching all roles...');
    const roles = await roleRepository.find();
    console.log(`✅ Found ${roles.length} roles\n`);

    // Create a role map for quick lookup
    const roleMap = new Map<string, Role>();
    roles.forEach(role => roleMap.set(role.name, role));

    // Statistics
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const roleStats = new Map<string, number>();

    console.log('🔄 Migrating user roles...\n');

    for (const user of users) {
      try {
        // Check if user already has dbRoles
        const userWithRoles = await userRepository.findOne({
          where: { id: user.id },
          relations: ['dbRoles']
        });

        if (userWithRoles?.dbRoles && userWithRoles.dbRoles.length > 0) {
          console.log(`  ⏭️  User ${user.email} already has ${userWithRoles.dbRoles.length} database roles, skipping...`);
          skippedCount++;
          continue;
        }

        // Get the legacy role from user.role column
        const legacyRoleName = user.role;

        if (!legacyRoleName) {
          console.log(`  ⚠️  User ${user.email} has no legacy role, skipping...`);
          skippedCount++;
          continue;
        }

        // Find the corresponding Role entity
        const role = roleMap.get(legacyRoleName);

        if (!role) {
          console.log(`  ❌ Role '${legacyRoleName}' not found for user ${user.email}`);
          errorCount++;
          continue;
        }

        // Assign the role to the user
        if (!userWithRoles) {
          console.log(`  ❌ User ${user.email} not found with relations`);
          errorCount++;
          continue;
        }

        userWithRoles.dbRoles = [role];
        await userRepository.save(userWithRoles);

        console.log(`  ✓ Migrated ${user.email}: ${legacyRoleName}`);
        migratedCount++;

        // Update statistics
        roleStats.set(legacyRoleName, (roleStats.get(legacyRoleName) || 0) + 1);

      } catch (error) {
        console.error(`  ❌ Error migrating user ${user.email}:`, error);
        errorCount++;
      }
    }

    // Summary
    console.log('\n📊 Migration Summary:');
    console.log(`   - Total users: ${users.length}`);
    console.log(`   - Migrated: ${migratedCount}`);
    console.log(`   - Skipped: ${skippedCount}`);
    console.log(`   - Errors: ${errorCount}`);
    console.log('\n📊 Role Statistics:');
    roleStats.forEach((count, roleName) => {
      console.log(`   - ${roleName}: ${count} users`);
    });

    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const verifyQuery = `
      SELECT
        r.name as role_name,
        COUNT(ur.user_id) as user_count
      FROM roles r
      LEFT JOIN user_roles ur ON r.id = ur.role_id
      GROUP BY r.id, r.name
      ORDER BY user_count DESC;
    `;
    const verifyResult = await AppDataSource.query(verifyQuery);
    console.log('\n📊 User Roles Count (from database):');
    verifyResult.forEach((row: any) => {
      console.log(`   - ${row.role_name}: ${row.user_count} users`);
    });

    console.log('\n✨ Migration completed successfully!\n');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during migration:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

// Run the migration
migrateUserRoles();
