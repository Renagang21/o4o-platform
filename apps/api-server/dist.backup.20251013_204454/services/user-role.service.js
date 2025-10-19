"use strict";
/**
 * User Role Service
 *
 * Handles synchronization between legacy role fields and new database roles.
 * Provides utilities for role management and migration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRoleService = void 0;
const connection_1 = require("../database/connection");
const User_1 = require("../entities/User");
const Role_1 = require("../entities/Role");
class UserRoleService {
    /**
     * Sync user's database roles based on their primary role field
     * This ensures backward compatibility during migration
     *
     * @param user User entity to sync
     * @returns Updated user with synced dbRoles
     */
    static async syncUserRoles(user) {
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
        }
        catch (error) {
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
    static async assignRoles(userId, roleNames) {
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
    static async removeRoles(userId, roleNames) {
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
            user.role = user.dbRoles[0].name;
        }
        // Save and return
        return await this.userRepository.save(user);
    }
    /**
     * Set user's primary role and sync database roles
     * @param userId User ID
     * @param roleName Role name to set as primary
     */
    static async setPrimaryRole(userId, roleName) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['dbRoles']
        });
        if (!user) {
            throw new Error('User not found');
        }
        // Validate role exists in enum
        if (!Object.values(User_1.UserRole).includes(roleName)) {
            throw new Error(`Invalid role: ${roleName}`);
        }
        // Update primary role
        user.role = roleName;
        // Sync database roles
        await this.syncUserRoles(user);
        // Save and return
        return await this.userRepository.save(user);
    }
    /**
     * Migrate all users to use database roles
     * This is a one-time migration utility
     */
    static async migrateAllUsersToDbRoles() {
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
                }
                catch (error) {
                    console.error(`Failed to migrate user ${user.id}:`, error);
                    failed++;
                }
            }
            return { success, failed };
        }
        catch (error) {
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
    static async getUserPermissions(userId) {
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
    static async userHasPermission(userId, permission) {
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
    static async getRoleStatistics() {
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
exports.UserRoleService = UserRoleService;
UserRoleService.roleRepository = connection_1.AppDataSource.getRepository(Role_1.Role);
UserRoleService.userRepository = connection_1.AppDataSource.getRepository(User_1.User);
exports.default = UserRoleService;
//# sourceMappingURL=user-role.service.js.map