/**
 * @core O4O_PLATFORM_CORE — RBAC
 * Core Service: RoleAssignmentService (RBAC SSOT)
 * Do not modify without CORE_CHANGE approval.
 * Freeze: WO-O4O-CORE-FREEZE-V1 (2026-03-11)
 *
 * RoleAssignmentService - Manages role assignments for RBAC
 *
 * This service replaces the deprecated User.role/roles/dbRoles fields.
 * All role-based authorization should use this service.
 *
 * @see RoleAssignment entity
 * @see docs/dev/investigations/user-refactor_2025-11/zerodata/04_rbac_policy.md
 */

import { Repository, In } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { RoleAssignment } from '../entities/RoleAssignment.js';
import { UserRole } from '../../../types/auth.js';
import logger from '../../../utils/logger.js';
import { invalidateRoles } from '../utils/role-cache.js';

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
   * Check if user is a platform-wide admin
   *
   * WO-O4O-LEGACY-PLATFORM-ADMIN-AND-OPERATOR-CODE-REMOVAL-V1:
   *   UserRole.ADMIN('platform:admin') 제거에 따른 allow-list 축소.
   *   해당 역할 보유자는 0 이었으므로 판정 결과 변화 없음.
   *   서비스 단위 admin 은 이 helper 가 아니라 `{service}:admin` guard 로 판정한다.
   */
  async isAdmin(userId: string): Promise<boolean> {
    return this.hasAnyRole(userId, [UserRole.SUPER_ADMIN]);
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
   *
   * WO-O4O-ADMIN-SERVICE-OPERATOR-REGISTRATION-IDENTITY-V2-V1:
   *   선택적 `manager` 를 받는다. 호출자가 트랜잭션 안에서 User·Membership·credential 을
   *   함께 만들 때 role_assignments 만 트랜잭션 밖에 남아 부분 생성이 되는 것을 막기 위함이다.
   *   **write 경로는 그대로 하나다**(F9 RBAC SSOT) — 저장소만 트랜잭션 manager 것으로 바꾼다.
   *   인자를 생략하면 기존 동작과 완전히 동일하다.
   */
  async assignRole(input: AssignRoleInput, manager?: EntityManager): Promise<RoleAssignment> {
    const { userId, role, assignedBy, validFrom, validUntil } = input;
    const repository = manager ? manager.getRepository(RoleAssignment) : this.repository;

    // Check if assignment already exists
    //
    // WO-O4O-ROLE-ASSIGNMENT-CONTRACT-CONSISTENCY-AUDIT-AND-HARDENING-V1 (3):
    //   `unique_active_role_per_user` 는 UNIQUE(user_id, role, **is_active**) 이므로
    //   같은 (user, role) 에 활성 1행 + 비활성 1행이 공존할 수 있다(비활성 '유령' 행).
    //   조건 없는 findOne 은 그 중 어느 행을 집을지 비결정적이고, 비활성 행을 집어
    //   is_active=true 로 되살리면 이미 존재하는 활성 행과 충돌해 23505 로 실패한다.
    //   활성 행을 먼저 찾고, 없을 때만 비활성 행을 **복원**한다.
    //   (삭제·migration 없이 기존 행 복원 방식으로 해결 — 데이터는 그대로 둔다.)
    let assignment = await repository.findOne({
      where: { userId, role, isActive: true },
    });
    if (!assignment) {
      // WO-O4O-ROLE-DATA-CANONICALIZATION-AND-LEGACY-CLEANUP-V1:
      //   제약이 `UNIQUE (user_id, role) WHERE is_active` 로 바뀌어 **비활성 이력 행이 여러 개**
      //   존재할 수 있다. 어느 행을 복원할지 비결정적이면 안 되므로 가장 최근 행으로 고정한다.
      assignment = await repository.findOne({
        where: { userId, role, isActive: false },
        order: { assignedAt: 'DESC', id: 'DESC' },
      });
    }

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
      assignment = repository.create({
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

    const saved = await repository.save(assignment);
    invalidateRoles(userId); // WO-O4O-AUTH-ROLE-FRESHEN-V1
    return saved;
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
   *
   * WO-O4O-ROLE-DATA-CANONICALIZATION-AND-LEGACY-CLEANUP-V1:
   *   과거에는 같은 (user, role) 에 비활성 '쌍둥이' 행이 있으면 이 UPDATE 가
   *   `unique_active_role_per_user (user_id, role, is_active)` 와 충돌해 **23505 로 실패**했다.
   *   제약을 `UNIQUE (user_id, role) WHERE is_active` 부분 인덱스로 교체(migration 20270301000000)해
   *   비활성 행은 몇 개든 공존할 수 있으므로, 활성 행을 내리는 이 경로는 구조적으로 충돌하지 않는다.
   *   행을 지우지 않고 이력을 남긴다.
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
    invalidateRoles(userId); // WO-O4O-AUTH-ROLE-FRESHEN-V1

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
    invalidateRoles(userId); // WO-O4O-AUTH-ROLE-FRESHEN-V1

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
