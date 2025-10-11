/**
 * User Role Service
 *
 * Handles synchronization between legacy role fields and new database roles.
 * Provides utilities for role management and migration.
 */

import { AppDataSource } from '../database/connection';
import { User, UserRole } from '../entities/User';
import { Role } from '../entities/Role';

export class UserRoleService {
  private static roleRepository = AppDataSource.getRepository(Role);
  private static userRepository = AppDataSource.getRepository(User);

  /**
   * Sync user's database roles based on their primary role field
   * This ensures backward compatibility during migration
   *
   * @param user User entity to sync
   * @returns Updated user with synced dbRoles
   */
  static async syncUserRoles(user: User): Promise<User> {
    try {
      // Get role from database
      const dbRole = await this.roleRepository.findOne({
        where: { name: user.role, isActive: true },
        relations: ['permissions']
      });

      if (dbRole) {
        // Initialize dbRoles if not loaded
        if (!user.dbRoles) {
          user.dbRoles = [];
        }

        // Check if role is already assigned
        const hasRole = user.dbRoles.some(r => r.id === dbRole.id);

        if (!hasRole) {
          // Add the role
          user.dbRoles = [dbRole];

          // Update legacy roles array for compatibility
          user.roles = [dbRole.name];
        }
      }

      return user;
    } catch (error) {
      console.error('Failed to sync user roles:', error);
      // Return user unchanged if sync fails
      return user;
    }
  }

  /**
   * Assign additional roles to a user
   * @param userId User ID
   * @param roleNames Array of role names to assign
   */
  static async assignRoles(userId: string, roleNames: string[]): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['dbRoles']
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Fetch roles from database
    const roles = await this.roleRepository
      .createQueryBuilder('role')
      .where('role.name IN (:...names)', { names: roleNames })
      .andWhere('role.isActive = :isActive', { isActive: true })
      .getMany();

    if (roles.length === 0) {
      throw new Error('No valid roles found');
    }

    // Initialize dbRoles if not loaded
    if (!user.dbRoles) {
      user.dbRoles = [];
    }

    // Add new roles (avoid duplicates)
    const existingRoleIds = new Set(user.dbRoles.map(r => r.id));
    const newRoles = roles.filter(r => !existingRoleIds.has(r.id));

    user.dbRoles = [...user.dbRoles, ...newRoles];

    // Update legacy roles array
    user.roles = user.dbRoles.map(r => r.name);

    // Save and return
    return await this.userRepository.save(user);
  }

  /**
   * Remove roles from a user
   * @param userId User ID
   * @param roleNames Array of role names to remove
   */
  static async removeRoles(userId: string, roleNames: string[]): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['dbRoles']
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.dbRoles) {
      return user;
    }

    // Filter out roles to remove
    user.dbRoles = user.dbRoles.filter(r => !roleNames.includes(r.name));

    // Update legacy roles array
    user.roles = user.dbRoles.map(r => r.name);

    // If primary role is removed, update it
    if (roleNames.includes(user.role) && user.dbRoles.length > 0) {
      user.role = user.dbRoles[0].name as UserRole;
    }

    // Save and return
    return await this.userRepository.save(user);
  }

  /**
   * Set user's primary role and sync database roles
   * @param userId User ID
   * @param roleName Role name to set as primary
   */
  static async setPrimaryRole(userId: string, roleName: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['dbRoles']
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Validate role exists in enum
    if (!Object.values(UserRole).includes(roleName as UserRole)) {
      throw new Error(`Invalid role: ${roleName}`);
    }

    // Update primary role
    user.role = roleName as UserRole;

    // Sync database roles
    await this.syncUserRoles(user);

    // Save and return
    return await this.userRepository.save(user);
  }

  /**
   * Migrate all users to use database roles
   * This is a one-time migration utility
   */
  static async migrateAllUsersToDbRoles(): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    try {
      // Get all users
      const users = await this.userRepository.find({
        relations: ['dbRoles']
      });

      for (const user of users) {
        try {
          await this.syncUserRoles(user);
          await this.userRepository.save(user);
          success++;
        } catch (error) {
          console.error(`Failed to migrate user ${user.id}:`, error);
          failed++;
        }
      }

      return { success, failed };
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Get user's effective permissions
   * Combines permissions from all roles and direct permissions
   *
   * @param userId User ID
   * @returns Array of permission keys
   */
  static async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['dbRoles', 'dbRoles.permissions']
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user.getAllPermissions();
  }

  /**
   * Check if user has a specific permission
   * @param userId User ID
   * @param permission Permission key
   */
  static async userHasPermission(userId: string, permission: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['dbRoles', 'dbRoles.permissions']
    });

    if (!user) {
      return false;
    }

    return user.hasPermission(permission);
  }

  /**
   * Get statistics about role usage
   */
  static async getRoleStatistics(): Promise<{
    role: string;
    userCount: number;
    isDbRole: boolean;
  }[]> {
    // Get legacy role statistics
    const legacyStats = await this.userRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(user.id)', 'userCount')
      .groupBy('user.role')
      .getRawMany();

    // Get database role statistics
    const dbStats = await this.roleRepository
      .createQueryBuilder('role')
      .leftJoin('role.users', 'user')
      .select('role.name', 'role')
      .addSelect('COUNT(user.id)', 'userCount')
      .groupBy('role.name')
      .getRawMany();

    return [
      ...legacyStats.map(s => ({ ...s, isDbRole: false, userCount: parseInt(s.userCount) })),
      ...dbStats.map(s => ({ ...s, isDbRole: true, userCount: parseInt(s.userCount) }))
    ];
  }
}

export default UserRoleService;
