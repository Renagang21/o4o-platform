/**
 * RoleAssignmentService - Manages role assignments for RBAC
 *
 * This service replaces the deprecated User.role/roles/dbRoles fields.
 * All role-based authorization should use this service.
 *
 * @see RoleAssignment entity
 * @see docs/dev/investigations/user-refactor_2025-11/zerodata/04_rbac_policy.md
 */

import { Repository, In } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { RoleAssignment } from '../entities/RoleAssignment.js';
import { UserRole } from '../../../types/auth.js';
import logger from '../../../utils/logger.js';

export interface AssignRoleInput {
  userId: string;
  role: string;
  assignedBy?: string;
  validFrom?: Date;
  validUntil?: Date;
}

export class RoleAssignmentService {
  private repository: Repository<RoleAssignment>;

  constructor() {
    this.repository = AppDataSource.getRepository(RoleAssignment);
  }

  /**
   * Get all active role assignments for a user
   */
  async getActiveRoles(userId: string): Promise<RoleAssignment[]> {
    const assignments = await this.repository.find({
      where: { userId, isActive: true },
    });

    // Filter by validity period
    return assignments.filter((a) => a.isValidNow());
  }

  /**
   * Get all active role names for a user
   */
  async getRoleNames(userId: string): Promise<string[]> {
    const assignments = await this.getActiveRoles(userId);
    return assignments.map((a) => a.role);
  }

  /**
   * Check if user has a specific role
   */
  async hasRole(userId: string, role: string): Promise<boolean> {
    const assignment = await this.repository.findOne({
      where: { userId, role, isActive: true },
    });

    if (!assignment) {
      return false;
    }

    return assignment.isValidNow();
  }

  /**
   * Check if user has any of the specified roles
   */
  async hasAnyRole(userId: string, roles: string[]): Promise<boolean> {
    const assignments = await this.repository.find({
      where: { userId, role: In(roles), isActive: true },
    });

    return assignments.some((a) => a.isValidNow());
  }

  /**
   * Check if user has all of the specified roles
   */
  async hasAllRoles(userId: string, roles: string[]): Promise<boolean> {
    const activeRoles = await this.getRoleNames(userId);
    return roles.every((r) => activeRoles.includes(r));
  }

  /**
   * Check if user is admin (super_admin or admin)
   */
  async isAdmin(userId: string): Promise<boolean> {
    return this.hasAnyRole(userId, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);
  }

  /**
   * Check if user is supplier
   */
  async isSupplier(userId: string): Promise<boolean> {
    return this.hasRole(userId, 'supplier');
  }

  /**
   * Check if user is seller
   */
  async isSeller(userId: string): Promise<boolean> {
    return this.hasRole(userId, 'seller');
  }

  /**
   * Check if user is partner
   */
  async isPartner(userId: string): Promise<boolean> {
    return this.hasRole(userId, 'partner');
  }

  /**
   * Assign a role to a user
   */
  async assignRole(input: AssignRoleInput): Promise<RoleAssignment> {
    const { userId, role, assignedBy, validFrom, validUntil } = input;

    // Check if assignment already exists
    let assignment = await this.repository.findOne({
      where: { userId, role },
    });

    if (assignment) {
      // Reactivate existing assignment
      assignment.isActive = true;
      assignment.validFrom = validFrom || new Date();
      assignment.validUntil = validUntil;
      if (assignedBy) {
        assignment.assignedBy = assignedBy;
      }
      logger.info(
        `[RoleAssignmentService] Reactivated role ${role} for user ${userId}`
      );
    } else {
      // Create new assignment
      assignment = this.repository.create({
        userId,
        role,
        isActive: true,
        validFrom: validFrom || new Date(),
        validUntil,
        assignedBy,
        assignedAt: new Date(),
      });
      logger.info(
        `[RoleAssignmentService] Assigned role ${role} to user ${userId}`
      );
    }

    return await this.repository.save(assignment);
  }

  /**
   * Assign multiple roles to a user
   */
  async assignRoles(
    userId: string,
    roles: string[],
    assignedBy?: string
  ): Promise<RoleAssignment[]> {
    const results: RoleAssignment[] = [];

    for (const role of roles) {
      try {
        const assignment = await this.assignRole({ userId, role, assignedBy });
        results.push(assignment);
      } catch (error) {
        logger.error(
          `[RoleAssignmentService] Failed to assign role ${role} to user ${userId}:`,
          error
        );
      }
    }

    return results;
  }

  /**
   * Remove (deactivate) a role from a user
   */
  async removeRole(userId: string, role: string): Promise<boolean> {
    const assignment = await this.repository.findOne({
      where: { userId, role, isActive: true },
    });

    if (!assignment) {
      logger.warn(
        `[RoleAssignmentService] Role ${role} not found for user ${userId}`
      );
      return false;
    }

    assignment.deactivate();
    await this.repository.save(assignment);

    logger.info(
      `[RoleAssignmentService] Removed role ${role} from user ${userId}`
    );
    return true;
  }

  /**
   * Remove all roles from a user
   */
  async removeAllRoles(userId: string): Promise<number> {
    const assignments = await this.repository.find({
      where: { userId, isActive: true },
    });

    for (const assignment of assignments) {
      assignment.deactivate();
    }

    await this.repository.save(assignments);

    logger.info(
      `[RoleAssignmentService] Removed ${assignments.length} roles from user ${userId}`
    );
    return assignments.length;
  }

  /**
   * Get all users with a specific role
   */
  async getUsersWithRole(role: string): Promise<string[]> {
    const assignments = await this.repository.find({
      where: { role, isActive: true },
    });

    return assignments.filter((a) => a.isValidNow()).map((a) => a.userId);
  }

  /**
   * Sync user's legacy roles to role_assignments table
   * Used during migration from deprecated User.role/roles fields
   */
  async syncFromLegacyRoles(
    userId: string,
    legacyRole: string,
    legacyRoles: string[],
    assignedBy?: string
  ): Promise<RoleAssignment[]> {
    const rolesToAssign = new Set<string>();

    // Add primary role if valid
    if (legacyRole && legacyRole !== 'user') {
      rolesToAssign.add(legacyRole);
    }

    // Add roles array
    if (legacyRoles && legacyRoles.length > 0) {
      for (const r of legacyRoles) {
        if (r && r !== 'user') {
          rolesToAssign.add(r);
        }
      }
    }

    // Always ensure 'user' role exists
    rolesToAssign.add('user');

    return this.assignRoles(userId, Array.from(rolesToAssign), assignedBy);
  }

  /**
   * Get all permissions for a user's roles
   * Admin users get all permissions
   */
  async getPermissions(userId: string): Promise<string[]> {
    const isAdmin = await this.isAdmin(userId);

    if (isAdmin) {
      // Return all available permissions for admins
      return [
        // Users
        'users.view',
        'users.create',
        'users.edit',
        'users.delete',
        'users.suspend',
        'users.approve',
        // Content
        'content.view',
        'content.create',
        'content.edit',
        'content.delete',
        'content.publish',
        'content.moderate',
        // Categories & Tags
        'categories:write',
        'categories:read',
        'tags:write',
        'tags:read',
        // Admin
        'admin.settings',
        'admin.analytics',
        'admin.logs',
        'admin.backup',
        // ACF
        'acf.manage',
        // CPT
        'cpt.manage',
        // Shortcodes
        'shortcodes.manage',
        // API
        'api.access',
        'api.admin',
      ];
    }

    // For non-admin users, return role-based permissions
    // This can be extended with a role-permission mapping
    const roles = await this.getRoleNames(userId);
    const permissions: Set<string> = new Set();

    for (const role of roles) {
      const rolePermissions = this.getRolePermissions(role);
      rolePermissions.forEach((p) => permissions.add(p));
    }

    return Array.from(permissions);
  }

  /**
   * Get permissions for a specific role
   * This is a simplified mapping - can be extended with database-based permissions
   */
  private getRolePermissions(role: string): string[] {
    const rolePermissionMap: Record<string, string[]> = {
      user: ['content.view', 'api.access'],
      customer: ['content.view', 'api.access'],
      supplier: [
        'content.view',
        'content.create',
        'content.edit',
        'products.manage',
        'api.access',
      ],
      seller: [
        'content.view',
        'content.create',
        'content.edit',
        'orders.view',
        'api.access',
      ],
      partner: [
        'content.view',
        'content.create',
        'content.edit',
        'analytics.view',
        'api.access',
      ],
      moderator: [
        'content.view',
        'content.create',
        'content.edit',
        'content.delete',
        'content.moderate',
        'api.access',
      ],
    };

    return rolePermissionMap[role] || [];
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const permissions = await this.getPermissions(userId);
    return permissions.includes(permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(
    userId: string,
    permissions: string[]
  ): Promise<boolean> {
    const userPermissions = await this.getPermissions(userId);
    return permissions.some((p) => userPermissions.includes(p));
  }

  /**
   * Check if user has all of the specified permissions
   */
  async hasAllPermissions(
    userId: string,
    permissions: string[]
  ): Promise<boolean> {
    const userPermissions = await this.getPermissions(userId);
    return permissions.every((p) => userPermissions.includes(p));
  }
}

// Export singleton instance
export const roleAssignmentService = new RoleAssignmentService();

export default RoleAssignmentService;
