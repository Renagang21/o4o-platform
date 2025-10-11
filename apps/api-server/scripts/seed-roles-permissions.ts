#!/usr/bin/env ts-node
/**
 * Seed Roles and Permissions
 *
 * This script seeds the database with initial roles and permissions
 * based on the existing PERMISSIONS and ROLE_PERMISSIONS configuration.
 *
 * Usage:
 * ts-node scripts/seed-roles-permissions.ts
 */

import 'reflect-metadata';
import { AppDataSource } from '../src/database/connection';
import { Role } from '../src/entities/Role';
import { Permission } from '../src/entities/Permission';
import { UserRole } from '../src/types/auth';

// Import existing permission definitions
const PERMISSIONS = {
  // User management
  'users.view': 'View users',
  'users.create': 'Create users',
  'users.edit': 'Edit users',
  'users.delete': 'Delete users',
  'users.suspend': 'Suspend/unsuspend users',
  'users.approve': 'Approve users',

  // Content management
  'content.view': 'View content',
  'content.create': 'Create content',
  'content.edit': 'Edit content',
  'content.delete': 'Delete content',
  'content.publish': 'Publish content',
  'content.moderate': 'Moderate content',

  // System administration
  'admin.settings': 'Manage system settings',
  'admin.analytics': 'View analytics',
  'admin.logs': 'View system logs',
  'admin.backup': 'Manage backups',

  // ACF and CPT
  'acf.manage': 'Manage custom fields',
  'cpt.manage': 'Manage custom post types',
  'shortcodes.manage': 'Manage shortcodes',

  // API access
  'api.access': 'Access API',
  'api.admin': 'Admin API access'
} as const;

// Role permission mappings
const ROLE_PERMISSIONS: Record<string, string[]> = {
  'super_admin': Object.keys(PERMISSIONS),
  'admin': Object.keys(PERMISSIONS),
  'moderator': [
    'users.view', 'users.suspend', 'users.approve',
    'content.view', 'content.edit', 'content.moderate', 'content.publish',
    'admin.analytics', 'admin.logs',
    'api.access'
  ],
  'manager': [
    'users.view',
    'content.view', 'content.create', 'content.edit', 'content.publish',
    'acf.manage', 'cpt.manage', 'shortcodes.manage',
    'api.access'
  ],
  'vendor': [
    'content.view', 'content.create', 'content.edit',
    'api.access'
  ],
  'vendor_manager': [
    'users.view', 'users.create', 'users.edit',
    'content.view', 'content.create', 'content.edit', 'content.publish',
    'admin.analytics',
    'api.access'
  ],
  'seller': [
    'content.view', 'content.create',
    'api.access'
  ],
  'customer': [
    'content.view',
    'api.access'
  ],
  'business': [
    'content.view', 'content.create',
    'api.access'
  ],
  'partner': [
    'content.view', 'content.create',
    'api.access'
  ],
  'beta_user': [
    'content.view', 'content.create',
    'api.access'
  ],
  'supplier': [
    'content.view', 'content.create',
    'api.access'
  ],
  'affiliate': [
    'content.view',
    'api.access'
  ]
};

// Role display names and descriptions
const ROLE_INFO: Record<string, { displayName: string; description: string; isSystem: boolean }> = {
  'super_admin': {
    displayName: 'Super Administrator',
    description: 'Full system access with all permissions',
    isSystem: true
  },
  'admin': {
    displayName: 'Administrator',
    description: 'Full administrative access',
    isSystem: true
  },
  'moderator': {
    displayName: 'Moderator',
    description: 'Content moderation and user management',
    isSystem: false
  },
  'manager': {
    displayName: 'Manager',
    description: 'Content and user management',
    isSystem: false
  },
  'vendor': {
    displayName: 'Vendor',
    description: 'Vendor account with content management',
    isSystem: false
  },
  'vendor_manager': {
    displayName: 'Vendor Manager',
    description: 'Manages vendors and their content',
    isSystem: false
  },
  'seller': {
    displayName: 'Seller',
    description: 'Seller account for marketplace',
    isSystem: false
  },
  'customer': {
    displayName: 'Customer',
    description: 'Regular customer account',
    isSystem: false
  },
  'business': {
    displayName: 'Business',
    description: 'Business account',
    isSystem: false
  },
  'partner': {
    displayName: 'Partner',
    description: 'Partner account',
    isSystem: false
  },
  'beta_user': {
    displayName: 'Beta User',
    description: 'Beta testing account',
    isSystem: false
  },
  'supplier': {
    displayName: 'Supplier',
    description: 'Supplier account',
    isSystem: false
  },
  'affiliate': {
    displayName: 'Affiliate',
    description: 'Affiliate marketing account',
    isSystem: false
  }
};

async function seedRolesAndPermissions() {
  try {
    console.log('🌱 Starting to seed roles and permissions...\n');

    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connection initialized\n');
    }

    const permissionRepository = AppDataSource.getRepository(Permission);
    const roleRepository = AppDataSource.getRepository(Role);

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🧹 Clearing existing data...');
    await AppDataSource.query('DELETE FROM role_permissions');
    await AppDataSource.query('DELETE FROM user_roles');
    await roleRepository.delete({});
    await permissionRepository.delete({});
    console.log('✅ Existing data cleared\n');

    // Seed permissions
    console.log('📝 Seeding permissions...');
    const permissionMap = new Map<string, Permission>();

    for (const [key, description] of Object.entries(PERMISSIONS)) {
      const [category] = key.split('.');
      const permission = permissionRepository.create({
        key,
        description,
        category,
        isActive: true
      });
      const savedPermission = await permissionRepository.save(permission);
      permissionMap.set(key, savedPermission);
      console.log(`  ✓ Created permission: ${key}`);
    }
    console.log(`✅ ${permissionMap.size} permissions seeded\n`);

    // Seed roles
    console.log('👥 Seeding roles...');
    const roleMap = new Map<string, Role>();

    for (const [roleName, permissionKeys] of Object.entries(ROLE_PERMISSIONS)) {
      const roleInfo = ROLE_INFO[roleName] || {
        displayName: roleName.charAt(0).toUpperCase() + roleName.slice(1).replace(/_/g, ' '),
        description: `${roleName} role`,
        isSystem: false
      };

      const rolePermissions = permissionKeys
        .map(key => permissionMap.get(key))
        .filter((p): p is Permission => p !== undefined);

      const role = roleRepository.create({
        name: roleName,
        displayName: roleInfo.displayName,
        description: roleInfo.description,
        isSystem: roleInfo.isSystem,
        isActive: true,
        permissions: rolePermissions
      });

      const savedRole = await roleRepository.save(role);
      roleMap.set(roleName, savedRole);
      console.log(`  ✓ Created role: ${roleInfo.displayName} (${permissionKeys.length} permissions)`);
    }
    console.log(`✅ ${roleMap.size} roles seeded\n`);

    // Summary
    console.log('📊 Seeding Summary:');
    console.log(`   - Permissions: ${permissionMap.size}`);
    console.log(`   - Roles: ${roleMap.size}`);
    console.log('\n✨ Seeding completed successfully!\n');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

// Run the seed
seedRolesAndPermissions();
