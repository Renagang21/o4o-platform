/**
 * MembershipConsoleController — Extension Layer
 * WO-O4O-MEMBERSHIP-CONSOLE-V1
 *
 * Operator 회원 콘솔: 사용자 + service_memberships + role_assignments 통합 조회
 * Core Freeze F10 준수: AdminUserController/users.routes 미수정, Extension 엔드포인트 사용
 */
import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import type { ServiceScope } from '../../utils/serviceScope.js';
import { hashPassword } from '../../utils/auth.utils.js';
import logger from '../../utils/logger.js';
import { MembershipApprovalService } from '../../services/approval/MembershipApprovalService.js';
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';
import { roleService } from '../../modules/auth/services/role.service.js';
import { ActionLogService } from '@o4o/action-log-core';

const approvalService = new MembershipApprovalService();


export class MembershipConsoleController {
  private actionLogService?: ActionLogService;

  private getActionLogService(): ActionLogService {
    if (!this.actionLogService && AppDataSource.isInitialized) {
      this.actionLogService = new ActionLogService(AppDataSource);
    }
    return this.actionLogService!;
  }

  /**
   * Service boundary check — non-platform-admin can only access users in their service scope
   */
  private async checkServiceBoundary(userId: string, serviceKeys: string[]): Promise<boolean> {
    const result = await AppDataSource.query(
      `SELECT 1 FROM service_memberships WHERE user_id = $1 AND service_key = ANY($2) LIMIT 1`,
      [userId, serviceKeys]
    );
    return result.length > 0;
  }

  /**
   * GET /api/v1/operator/members
   * 회원 목록 + service_memberships + role_assignments
   */
  getMembers = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const {
        page = 1,
        limit = 20,
        search,
        status,
        serviceKey,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
      } = req.query;

      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(100, Math.max(1, Number(limit)));
      const offset = (pageNum - 1) * limitNum;

      // Build WHERE conditions
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIdx = 1;

      if (search) {
        conditions.push(
          `(u."firstName" ILIKE $${paramIdx} OR u."lastName" ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx} OR u.name ILIKE $${paramIdx})`
        );
        params.push(`%${search}%`);
        paramIdx++;
      }

      if (status && status !== 'all') {
        conditions.push(`u.status = $${paramIdx}`);
        params.push(status);
        paramIdx++;
      }

      // WO-O4O-SERVICE-DATA-ISOLATION-FIX-V1: Service scope filter
      // Platform admin: optional serviceKey filter from query param
      // Service operator: mandatory filter from scope (overrides query param)
      if (!scope.isPlatformAdmin) {
        conditions.push(
          `EXISTS (SELECT 1 FROM service_memberships sm2 WHERE sm2.user_id = u.id AND sm2.service_key = ANY($${paramIdx}))`
        );
        params.push(scope.serviceKeys);
        paramIdx++;
      } else if (serviceKey && serviceKey !== 'all') {
        conditions.push(
          `EXISTS (SELECT 1 FROM service_memberships sm2 WHERE sm2.user_id = u.id AND sm2.service_key = $${paramIdx})`
        );
        params.push(serviceKey);
        paramIdx++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Sorting
      const validSortFields: Record<string, string> = {
        createdAt: 'u."createdAt"',
        updatedAt: 'u."updatedAt"',
        email: 'u.email',
        firstName: 'u."firstName"',
        lastName: 'u."lastName"',
      };
      const sortField = validSortFields[sortBy as string] || 'u."createdAt"';
      const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';

      // Count total
      const countResult = await AppDataSource.query(
        `SELECT COUNT(*)::int as total FROM users u ${whereClause}`,
        params
      );
      const total = countResult[0]?.total || 0;
      const totalPages = Math.ceil(total / limitNum);

      // Fetch users (users 테이블: camelCase columns — SnakeNamingStrategy 비활성)
      const users = await AppDataSource.query(
        `SELECT u.id, u.email, u."firstName", u."lastName", u.name, u.nickname, u.phone,
                u.status, u."isActive", u."createdAt", u."updatedAt",
                u."businessInfo"->>'businessName' AS company
         FROM users u
         ${whereClause}
         ORDER BY ${sortField} ${order}
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, limitNum, offset]
      );

      if (users.length === 0) {
        res.json({
          success: true,
          users: [],
          pagination: { page: pageNum, limit: limitNum, total, totalPages },
        });
        return;
      }

      const userIds = users.map((u: any) => u.id);

      // Batch fetch role_assignments
      const roleRows = await AppDataSource.query(
        `SELECT user_id, ARRAY_AGG(role ORDER BY role) as roles
         FROM role_assignments
         WHERE user_id = ANY($1) AND is_active = true
         GROUP BY user_id`,
        [userIds]
      );
      const roleMap: Record<string, string[]> = {};
      for (const row of roleRows) {
        roleMap[row.user_id] = row.roles || [];
      }

      // Batch fetch service_memberships (scoped by service)
      const membershipRows = scope.isPlatformAdmin
        ? await AppDataSource.query(
            `SELECT id, user_id, service_key, status, role, approved_by, approved_at, rejection_reason, created_at
             FROM service_memberships
             WHERE user_id = ANY($1)
             ORDER BY created_at DESC`,
            [userIds]
          )
        : await AppDataSource.query(
            `SELECT id, user_id, service_key, status, role, approved_by, approved_at, rejection_reason, created_at
             FROM service_memberships
             WHERE user_id = ANY($1) AND service_key = ANY($2)
             ORDER BY created_at DESC`,
            [userIds, scope.serviceKeys]
          );
      const membershipMap: Record<string, any[]> = {};
      for (const row of membershipRows) {
        if (!membershipMap[row.user_id]) membershipMap[row.user_id] = [];
        membershipMap[row.user_id].push({
          id: row.id,
          serviceKey: row.service_key,
          status: row.status,
          role: row.role,
          approvedBy: row.approved_by,
          approvedAt: row.approved_at,
          rejectionReason: row.rejection_reason,
          createdAt: row.created_at,
        });
      }

      // Compose response
      const enrichedUsers = users.map((u: any) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        name: u.name,
        nickname: u.nickname || null,
        company: u.company,
        phone: u.phone,
        status: u.status,
        isActive: u.isActive,
        roles: roleMap[u.id] || [],
        memberships: membershipMap[u.id] || [],
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      }));

      res.json({
        success: true,
        users: enrichedUsers,
        pagination: { page: pageNum, limit: limitNum, total, totalPages },
      });
    } catch (error) {
      logger.error('[MembershipConsole] getMembers error', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ success: false, error: 'Failed to fetch members' });
    }
  };

  /**
   * GET /api/v1/operator/members/:userId
   * 회원 상세: 기본정보 + role_assignments + service_memberships
   */
  getMemberDetail = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const { userId } = req.params;

      // WO-O4O-SERVICE-DATA-ISOLATION-FIX-V1: Service boundary check
      if (!scope.isPlatformAdmin) {
        const hasAccess = await this.checkServiceBoundary(userId, scope.serviceKeys);
        if (!hasAccess) {
          res.status(404).json({ success: false, error: 'User not found' });
          return;
        }
      }

      // Fetch user (users 테이블: camelCase columns)
      const userRows = await AppDataSource.query(
        `SELECT id, email, "firstName", "lastName", name, nickname, phone,
                status, "isActive", "createdAt", "updatedAt",
                "businessInfo",
                "businessInfo"->>'businessName' AS company
         FROM users WHERE id = $1`,
        [userId]
      );

      if (userRows.length === 0) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const u = userRows[0];

      // Fetch role_assignments
      const roleRows = await AppDataSource.query(
        `SELECT ra.id, ra.role, ra.is_active, ra.valid_from, ra.valid_until, ra.assigned_by, ra.scope_type, ra.scope_id, ra.created_at,
                COALESCE(r.is_admin_role, false) AS is_admin_role
         FROM role_assignments ra
         LEFT JOIN roles r ON ra.role = r.name
         WHERE ra.user_id = $1
         ORDER BY ra.is_active DESC, ra.created_at DESC`,
        [userId]
      );

      // Fetch service_memberships (scoped by service)
      const membershipRows = scope.isPlatformAdmin
        ? await AppDataSource.query(
            `SELECT id, service_key, status, role, approved_by, approved_at, rejection_reason, created_at, updated_at
             FROM service_memberships
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [userId]
          )
        : await AppDataSource.query(
            `SELECT id, service_key, status, role, approved_by, approved_at, rejection_reason, created_at, updated_at
             FROM service_memberships
             WHERE user_id = $1 AND service_key = ANY($2)
             ORDER BY created_at DESC`,
            [userId, scope.serviceKeys]
          );

      res.json({
        success: true,
        user: {
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          name: u.name,
          nickname: u.nickname || null,
          company: u.company,
          phone: u.phone,
          status: u.status,
          isActive: u.isActive,
          businessInfo: u.businessInfo || null,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        },
        roles: roleRows.map((r: any) => ({
          id: r.id,
          role: r.role,
          isActive: r.is_active,
          isAdminRole: r.is_admin_role || false,
          validFrom: r.valid_from,
          validUntil: r.valid_until,
          assignedBy: r.assigned_by,
          scopeType: r.scope_type,
          scopeId: r.scope_id,
          createdAt: r.created_at,
        })),
        memberships: membershipRows.map((m: any) => ({
          id: m.id,
          serviceKey: m.service_key,
          status: m.status,
          role: m.role,
          approvedBy: m.approved_by,
          approvedAt: m.approved_at,
          rejectionReason: m.rejection_reason,
          createdAt: m.created_at,
          updatedAt: m.updated_at,
        })),
      });
    } catch (error) {
      logger.error('[MembershipConsole] getMemberDetail error', {
        userId: req.params.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ success: false, error: 'Failed to fetch member detail' });
    }
  };

  /**
   * PATCH /api/v1/operator/members/:membershipId/approve
   * 서비스 멤버십 승인
   */
  approveMembership = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const { membershipId } = req.params;
      const approvedBy = (req as any).user?.id || null;

      const membership = await approvalService.approveMembership({
        membershipId,
        approvedBy,
        isPlatformAdmin: scope.isPlatformAdmin,
        serviceKeys: scope.serviceKeys,
      });

      if (!membership) {
        res.status(404).json({ success: false, error: 'Membership not found or already active' });
        return;
      }

      const serviceKey = membership.service_key || scope.serviceKeys[0] || 'platform';
      this.getActionLogService()?.logSuccess(serviceKey, approvedBy || 'unknown', `${serviceKey}.operator.member_approve`, {
        meta: { targetId: membershipId, statusBefore: 'pending', statusAfter: 'active' },
      }).catch(() => {});
      res.json({ success: true, message: 'Membership approved', membership });
    } catch (error) {
      logger.error('[MembershipConsole] approveMembership error', {
        membershipId: req.params.membershipId,
        error: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
        detail: (error as any)?.detail,
      });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve membership',
        code: (error as any)?.code,
      });
    }
  };

  /**
   * PATCH /api/v1/operator/members/:membershipId/reject
   * 서비스 멤버십 거부
   */
  rejectMembership = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const { membershipId } = req.params;
      const { reason } = req.body;

      const membership = await approvalService.rejectMembership({
        membershipId,
        reason: reason || null,
        isPlatformAdmin: scope.isPlatformAdmin,
        serviceKeys: scope.serviceKeys,
      });

      if (!membership) {
        res.status(404).json({ success: false, error: 'Membership not found or already rejected' });
        return;
      }

      const serviceKey = membership.service_key || scope.serviceKeys[0] || 'platform';
      const rejectedBy = (req as any).user?.id || 'unknown';
      this.getActionLogService()?.logSuccess(serviceKey, rejectedBy, `${serviceKey}.operator.member_reject`, {
        meta: { targetId: membershipId, reason: reason || null, statusBefore: 'pending', statusAfter: 'rejected' },
      }).catch(() => {});
      res.json({ success: true, message: 'Membership rejected', membership });
    } catch (error) {
      logger.error('[MembershipConsole] rejectMembership error', {
        membershipId: req.params.membershipId,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reject membership',
      });
    }
  };

  /**
   * PATCH /api/v1/operator/members/:userId/status
   * 사용자 상태 변경 (approved, rejected, suspended 등)
   *
   * approved/active → MembershipApprovalService 위임 (atomic 3-table 일관성 보장)
   * 기타 → user 상태만 변경
   */
  updateMemberStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const { userId } = req.params;
      const { status } = req.body;
      const updatedBy = (req as any).user?.id || null;

      if (!status) {
        res.status(400).json({ success: false, error: 'status is required' });
        return;
      }

      if (!scope.isPlatformAdmin) {
        const hasAccess = await this.checkServiceBoundary(userId, scope.serviceKeys);
        if (!hasAccess) {
          res.status(404).json({ success: false, error: 'User not found' });
          return;
        }
      }

      if (status === 'approved' || status === 'active') {
        // Delegate to MembershipApprovalService for atomic 3-table consistency
        // (membership + user + role_assignments in single transaction)
        const pendingMemberships = scope.isPlatformAdmin
          ? await AppDataSource.query(
              `SELECT id FROM service_memberships WHERE user_id = $1 AND status IN ('pending', 'rejected')`,
              [userId]
            )
          : await AppDataSource.query(
              `SELECT id FROM service_memberships WHERE user_id = $1 AND status IN ('pending', 'rejected') AND service_key = ANY($2)`,
              [userId, scope.serviceKeys]
            );

        if (pendingMemberships.length > 0) {
          for (const m of pendingMemberships) {
            await approvalService.approveMembership({
              membershipId: m.id,
              approvedBy: updatedBy,
              isPlatformAdmin: scope.isPlatformAdmin,
              serviceKeys: scope.serviceKeys,
            });
          }
        } else {
          // No pending memberships — just activate user (idempotent)
          await AppDataSource.query(
            `UPDATE users SET status = 'active', "isActive" = true,
             "approvedAt" = COALESCE("approvedAt", NOW()), "approvedBy" = COALESCE("approvedBy", $1),
             "updatedAt" = NOW()
             WHERE id = $2`,
            [updatedBy, userId]
          );
        }
      } else {
        // Non-approval status (rejected, suspended, etc.) — user status only
        // UserStatus enum uses lowercase: 'rejected', 'suspended', etc.
        const dbStatus = status.toLowerCase();
        await AppDataSource.query(
          `UPDATE users SET status = $1, "isActive" = false, "updatedAt" = NOW()
           WHERE id = $2`,
          [dbStatus, userId]
        );
      }

      res.json({ success: true, message: `User status updated to ${status}` });
    } catch (error) {
      logger.error('[MembershipConsole] updateMemberStatus error', {
        userId: req.params.userId,
        error: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
      });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user status',
        code: (error as any)?.code,
      });
    }
  };

  /**
   * PUT /api/v1/operator/members/:userId
   * 사용자 정보 수정 (프로필 + 비밀번호 + 사업자 정보)
   * WO-O4O-GLYCOPHARM-MEMBER-EDIT-V1
   */
  updateMember = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const { userId } = req.params;
      const {
        password, lastName, firstName, nickname, phone,
        businessName, businessNumber, taxEmail, businessType,
        businessCategory, address1, address2,
      } = req.body;

      if (!scope.isPlatformAdmin) {
        const hasAccess = await this.checkServiceBoundary(userId, scope.serviceKeys);
        if (!hasAccess) {
          res.status(404).json({ success: false, error: 'User not found' });
          return;
        }
      }

      // 1. Password update (기존 로직)
      if (password) {
        const hashedPassword = await hashPassword(password);
        await AppDataSource.query(
          `UPDATE users SET password = $1, "updatedAt" = NOW() WHERE id = $2`,
          [hashedPassword, userId]
        );
      }

      // 2. Profile fields update
      const sets: string[] = [];
      const params: any[] = [];
      let idx = 1;

      if (lastName !== undefined) { sets.push(`"lastName" = $${idx++}`); params.push(lastName); }
      if (firstName !== undefined) { sets.push(`"firstName" = $${idx++}`); params.push(firstName); }
      if (nickname !== undefined) { sets.push(`nickname = $${idx++}`); params.push(nickname); }
      if (phone !== undefined) { sets.push(`phone = $${idx++}`); params.push(phone.replace(/\D/g, '')); }

      // name 동기화 (lastName+firstName → name)
      if (lastName !== undefined || firstName !== undefined) {
        sets.push(`name = $${idx++}`);
        params.push(`${lastName || ''}${firstName || ''}`.trim());
      }

      // 3. businessInfo JSONB 머지
      const bizFields: Record<string, string> = {};
      if (businessName !== undefined) bizFields.businessName = businessName;
      if (businessNumber !== undefined) bizFields.businessNumber = businessNumber;
      if (taxEmail !== undefined) bizFields.email = taxEmail;
      if (businessType !== undefined) bizFields.businessType = businessType;
      if (businessCategory !== undefined) bizFields.businessCategory = businessCategory;
      if (address1 !== undefined) bizFields.address = address1;
      if (address2 !== undefined) bizFields.address2 = address2;
      // WO-O4O-STORE-PROFILE-UNIFICATION-V1: 구조화된 주소 동기화
      if (address1 !== undefined || address2 !== undefined) {
        (bizFields as any).storeAddress = {
          baseAddress: address1 || '',
          ...(address2 ? { detailAddress: address2 } : {}),
        };
      }

      if (Object.keys(bizFields).length > 0) {
        const [existing] = await AppDataSource.query(
          `SELECT "businessInfo" FROM users WHERE id = $1`, [userId]
        );
        const merged = { ...(existing?.businessInfo || {}), ...bizFields };
        sets.push(`"businessInfo" = $${idx++}`);
        params.push(JSON.stringify(merged));
      }

      if (sets.length > 0) {
        sets.push(`"updatedAt" = NOW()`);
        params.push(userId);
        await AppDataSource.query(
          `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx}`,
          params
        );
      }

      res.json({ success: true, message: 'User updated' });
    } catch (error) {
      logger.error('[MembershipConsole] updateMember error', {
        userId: req.params.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ success: false, error: 'Failed to update member' });
    }
  };

  /**
   * DELETE /api/v1/operator/members/:userId
   * 사용자 삭제 (service_memberships + user)
   */
  deleteMember = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const { userId } = req.params;
      const deletedBy = (req as any).user?.id || null;

      const deleted = await approvalService.deleteMember({
        userId,
        deletedBy,
        isPlatformAdmin: scope.isPlatformAdmin,
        serviceKeys: scope.serviceKeys,
      });

      if (!deleted) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      res.json({ success: true, message: 'User deleted' });
    } catch (error) {
      logger.error('[MembershipConsole] deleteMember error', {
        userId: req.params.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete member',
      });
    }
  };

  /**
   * POST /api/v1/operator/members/:userId/roles
   * 역할 할당 (role_assignments via roleAssignmentService)
   */
  assignMemberRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const { userId } = req.params;
      const { role } = req.body;
      const assignedBy = (req as any).user?.id || null;

      if (!role || typeof role !== 'string') {
        res.status(400).json({ success: false, error: 'role is required' });
        return;
      }

      // DB-based role validation (WO-O4O-ROLE-SYSTEM-DB-DESIGN-V1)
      const roleEntity = await roleService.getRoleByName(role);
      if (!roleEntity) {
        res.status(400).json({ success: false, error: 'Invalid role' });
        return;
      }

      // Service boundary check
      if (!scope.isPlatformAdmin) {
        // Assignability check
        if (!roleEntity.isAssignable) {
          res.status(403).json({ success: false, error: 'This role is not assignable' });
          return;
        }
        const hasAccess = await this.checkServiceBoundary(userId, scope.serviceKeys);
        if (!hasAccess) {
          res.status(404).json({ success: false, error: 'User not found' });
          return;
        }
        // 1. Service prefix check (rolePrefixes = raw prefixes from JWT roles)
        const allowedPrefixes = scope.rolePrefixes.map((p: string) => `${p}:`);
        if (!allowedPrefixes.some((prefix: string) => role.startsWith(prefix))) {
          res.status(403).json({ success: false, error: 'Cannot assign roles outside your service scope' });
          return;
        }
        // 2. Admin role restriction — only service admins can manage admin-level roles
        if (roleEntity.isAdminRole) {
          const userRoles: string[] = (req as any).user?.roles || [];
          const callerIsServiceAdmin = scope.rolePrefixes.some(
            (p: string) => userRoles.includes(`${p}:admin`)
          );
          if (!callerIsServiceAdmin) {
            res.status(403).json({ success: false, error: 'Only admins can manage admin-level roles' });
            return;
          }
          // 3. Self-assignment prevention for admin roles
          if (assignedBy === userId) {
            res.status(403).json({ success: false, error: 'Cannot assign admin role to yourself' });
            return;
          }
        }
      }

      const assignment = await roleAssignmentService.assignRole({
        userId,
        role,
        assignedBy,
      });

      res.json({ success: true, message: `Role ${role} assigned`, assignment });
    } catch (error) {
      logger.error('[MembershipConsole] assignMemberRole error', {
        userId: req.params.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign role',
      });
    }
  };

  /**
   * DELETE /api/v1/operator/members/:userId/roles/:role
   * 역할 제거 (soft delete via roleAssignmentService)
   */
  removeMemberRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const { userId, role } = req.params;

      if (!role) {
        res.status(400).json({ success: false, error: 'role is required' });
        return;
      }

      // DB-based role validation (WO-O4O-ROLE-SYSTEM-DB-DESIGN-V1)
      const roleEntity = await roleService.getRoleByName(role);
      if (!roleEntity) {
        res.status(400).json({ success: false, error: 'Invalid role' });
        return;
      }

      // Service boundary check
      if (!scope.isPlatformAdmin) {
        const hasAccess = await this.checkServiceBoundary(userId, scope.serviceKeys);
        if (!hasAccess) {
          res.status(404).json({ success: false, error: 'User not found' });
          return;
        }
        // 1. Service prefix check (rolePrefixes = raw prefixes from JWT roles)
        const allowedPrefixes = scope.rolePrefixes.map((p: string) => `${p}:`);
        if (!allowedPrefixes.some((prefix: string) => role.startsWith(prefix))) {
          res.status(403).json({ success: false, error: 'Cannot remove roles outside your service scope' });
          return;
        }
        // 2. Admin role restriction — only service admins can manage admin-level roles
        if (roleEntity.isAdminRole) {
          const userRoles: string[] = (req as any).user?.roles || [];
          const callerIsServiceAdmin = scope.rolePrefixes.some(
            (p: string) => userRoles.includes(`${p}:admin`)
          );
          if (!callerIsServiceAdmin) {
            res.status(403).json({ success: false, error: 'Only admins can manage admin-level roles' });
            return;
          }
          // 3. Self-removal prevention for admin roles
          const requesterId = (req as any).user?.id;
          if (requesterId === userId) {
            res.status(403).json({ success: false, error: 'Cannot remove your own admin role' });
            return;
          }
        }
      }

      const removed = await roleAssignmentService.removeRole(userId, role);

      if (!removed) {
        res.status(404).json({ success: false, error: 'Role not found or already inactive' });
        return;
      }

      res.json({ success: true, message: `Role ${role} removed` });
    } catch (error) {
      logger.error('[MembershipConsole] removeMemberRole error', {
        userId: req.params.userId,
        role: req.params.role,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove role',
      });
    }
  };

  /**
   * GET /api/v1/operator/members/stats
   * 서비스 멤버십 통계 (operator 전용)
   */
  getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;

      const serviceFilter = scope.isPlatformAdmin
        ? ''
        : `WHERE sm.service_key = ANY($1)`;
      const params = scope.isPlatformAdmin ? [] : [scope.serviceKeys];

      const rows = await AppDataSource.query(
        `SELECT u.status, COUNT(*)::int AS count
         FROM users u
         INNER JOIN service_memberships sm ON sm.user_id = u.id
         ${serviceFilter}
         GROUP BY u.status`,
        params
      );

      const total = rows.reduce((sum: number, r: any) => sum + (r.count || 0), 0);

      res.json({
        success: true,
        statistics: {
          total,
          byStatus: rows,
        },
      });
    } catch (error) {
      logger.error('[MembershipConsole] getStats error', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.json({ success: true, statistics: { total: 0, byStatus: [] } });
    }
  };
}
