/**
 * User Role Service
 *
 * Handles synchronization between legacy role fields and new database roles.
 * Provides utilities for role management and migration.
 */
import { User } from '../entities/User';
export declare class UserRoleService {
    private static roleRepository;
    private static userRepository;
    /**
     * Sync user's database roles based on their primary role field
     * This ensures backward compatibility during migration
     *
     * @param user User entity to sync
     * @returns Updated user with synced dbRoles
     */
    static syncUserRoles(user: User): Promise<User>;
    /**
     * Assign additional roles to a user
     * @param userId User ID
     * @param roleNames Array of role names to assign
     */
    static assignRoles(userId: string, roleNames: string[]): Promise<User>;
    /**
     * Remove roles from a user
     * @param userId User ID
     * @param roleNames Array of role names to remove
     */
    static removeRoles(userId: string, roleNames: string[]): Promise<User>;
    /**
     * Set user's primary role and sync database roles
     * @param userId User ID
     * @param roleName Role name to set as primary
     */
    static setPrimaryRole(userId: string, roleName: string): Promise<User>;
    /**
     * Migrate all users to use database roles
     * This is a one-time migration utility
     */
    static migrateAllUsersToDbRoles(): Promise<{
        success: number;
        failed: number;
    }>;
    /**
     * Get user's effective permissions
     * Combines permissions from all roles and direct permissions
     *
     * @param userId User ID
     * @returns Array of permission keys
     */
    static getUserPermissions(userId: string): Promise<string[]>;
    /**
     * Check if user has a specific permission
     * @param userId User ID
     * @param permission Permission key
     */
    static userHasPermission(userId: string, permission: string): Promise<boolean>;
    /**
     * Get statistics about role usage
     */
    static getRoleStatistics(): Promise<{
        role: string;
        userCount: number;
        isDbRole: boolean;
    }[]>;
}
export default UserRoleService;
//# sourceMappingURL=user-role.service.d.ts.map