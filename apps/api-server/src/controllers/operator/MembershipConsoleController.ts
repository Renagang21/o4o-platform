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

export class MembershipConsoleController {

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
        `SELECT u.id, u.email, u."firstName", u."lastName", u.name, u.phone,
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
      console.error('[MembershipConsole] getMembers error:', error);
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
      // Non-platform-admin can only view users that have a membership in their service
      if (!scope.isPlatformAdmin) {
        const accessCheck = await AppDataSource.query(
          `SELECT 1 FROM service_memberships
           WHERE user_id = $1 AND service_key = ANY($2) LIMIT 1`,
          [userId, scope.serviceKeys]
        );
        if (accessCheck.length === 0) {
          res.status(404).json({ success: false, error: 'User not found' });
          return;
        }
      }

      // Fetch user (users 테이블: camelCase columns)
      const userRows = await AppDataSource.query(
        `SELECT id, email, "firstName", "lastName", name, phone,
                status, "isActive", "createdAt", "updatedAt",
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
        `SELECT id, role, is_active, valid_from, valid_until, assigned_by, scope_type, scope_id, created_at
         FROM role_assignments
         WHERE user_id = $1
         ORDER BY is_active DESC, created_at DESC`,
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
          company: u.company,
          phone: u.phone,
          status: u.status,
          isActive: u.isActive,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        },
        roles: roleRows.map((r: any) => ({
          id: r.id,
          role: r.role,
          isActive: r.is_active,
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
      console.error('[MembershipConsole] getMemberDetail error:', error);
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

      // WO-O4O-SERVICE-DATA-ISOLATION-FIX-V1: Service boundary on write
      const result = scope.isPlatformAdmin
        ? await AppDataSource.query(
            `UPDATE service_memberships
             SET status = 'active', approved_by = $1, approved_at = NOW(), updated_at = NOW()
             WHERE id = $2 AND status IN ('pending', 'rejected')
             RETURNING id, user_id, service_key, role, status`,
            [approvedBy, membershipId]
          )
        : await AppDataSource.query(
            `UPDATE service_memberships
             SET status = 'active', approved_by = $1, approved_at = NOW(), updated_at = NOW()
             WHERE id = $2 AND status IN ('pending', 'rejected') AND service_key = ANY($3)
             RETURNING id, user_id, service_key, role, status`,
            [approvedBy, membershipId, scope.serviceKeys]
          );

      if (result.length === 0) {
        res.status(404).json({ success: false, error: 'Membership not found or already active' });
        return;
      }

      // WO-O4O-OPERATOR-MEMBERSHIP-APPROVAL-COMPLETE-V1:
      // Activate user account if pending/rejected (idempotent)
      const approvedUserId = result[0].user_id;
      await AppDataSource.query(
        `UPDATE users SET status = 'ACTIVE', "isActive" = true,
         "approvedAt" = NOW(), "approvedBy" = $1, "updatedAt" = NOW()
         WHERE id = $2 AND status IN ('PENDING', 'pending', 'rejected')`,
        [approvedBy, approvedUserId]
      );

      // Ensure role_assignment exists (idempotent — ON CONFLICT 시 updated_at 갱신)
      const memberRole = result[0].role || 'member';
      await AppDataSource.query(
        `INSERT INTO role_assignments (user_id, role, assigned_by, is_active, valid_from, created_at, updated_at)
         VALUES ($1, $2, $3, true, NOW(), NOW(), NOW())
         ON CONFLICT ON CONSTRAINT "unique_active_role_per_user"
         DO UPDATE SET updated_at = NOW(), is_active = true`,
        [approvedUserId, memberRole, approvedBy]
      );

      res.json({ success: true, message: 'Membership approved', membership: result[0] });
    } catch (error) {
      console.error('[MembershipConsole] approveMembership error:', error);
      res.status(500).json({ success: false, error: 'Failed to approve membership' });
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

      // WO-O4O-SERVICE-DATA-ISOLATION-FIX-V1: Service boundary on write
      const result = scope.isPlatformAdmin
        ? await AppDataSource.query(
            `UPDATE service_memberships
             SET status = 'rejected', rejection_reason = $1, updated_at = NOW()
             WHERE id = $2 AND status IN ('pending', 'active')
             RETURNING id, user_id, service_key, role, status`,
            [reason || null, membershipId]
          )
        : await AppDataSource.query(
            `UPDATE service_memberships
             SET status = 'rejected', rejection_reason = $1, updated_at = NOW()
             WHERE id = $2 AND status IN ('pending', 'active') AND service_key = ANY($3)
             RETURNING id, user_id, service_key, role, status`,
            [reason || null, membershipId, scope.serviceKeys]
          );

      if (result.length === 0) {
        res.status(404).json({ success: false, error: 'Membership not found or already rejected' });
        return;
      }

      res.json({ success: true, message: 'Membership rejected', membership: result[0] });
    } catch (error) {
      console.error('[MembershipConsole] rejectMembership error:', error);
      res.status(500).json({ success: false, error: 'Failed to reject membership' });
    }
  };

  /**
   * PATCH /api/v1/operator/members/:userId/status
   * 사용자 상태 변경 (approved, rejected, suspended 등)
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

      // Service boundary check
      if (!scope.isPlatformAdmin) {
        const accessCheck = await AppDataSource.query(
          `SELECT 1 FROM service_memberships WHERE user_id = $1 AND service_key = ANY($2) LIMIT 1`,
          [userId, scope.serviceKeys]
        );
        if (accessCheck.length === 0) {
          res.status(404).json({ success: false, error: 'User not found' });
          return;
        }
      }

      // Map frontend status to DB status
      const dbStatus = status === 'approved' ? 'ACTIVE' : status.toUpperCase();
      const isActive = status === 'approved' || status === 'active';

      await AppDataSource.query(
        `UPDATE users SET status = $1, "isActive" = $2,
         "approvedAt" = CASE WHEN $1 = 'ACTIVE' THEN NOW() ELSE "approvedAt" END,
         "approvedBy" = CASE WHEN $1 = 'ACTIVE' THEN $3 ELSE "approvedBy" END,
         "updatedAt" = NOW()
         WHERE id = $4`,
        [dbStatus, isActive, updatedBy, userId]
      );

      // If approving, also activate service memberships
      if (status === 'approved' || status === 'active') {
        if (scope.isPlatformAdmin) {
          await AppDataSource.query(
            `UPDATE service_memberships SET status = 'active', approved_by = $1, approved_at = NOW(), updated_at = NOW()
             WHERE user_id = $2 AND status = 'pending'`,
            [updatedBy, userId]
          );
        } else {
          await AppDataSource.query(
            `UPDATE service_memberships SET status = 'active', approved_by = $1, approved_at = NOW(), updated_at = NOW()
             WHERE user_id = $2 AND status = 'pending' AND service_key = ANY($3)`,
            [updatedBy, userId, scope.serviceKeys]
          );
        }
      }

      res.json({ success: true, message: `User status updated to ${status}` });
    } catch (error) {
      console.error('[MembershipConsole] updateMemberStatus error:', error);
      res.status(500).json({ success: false, error: 'Failed to update user status' });
    }
  };

  /**
   * PUT /api/v1/operator/members/:userId
   * 사용자 정보 수정 (비밀번호 변경 등)
   */
  updateMember = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const { userId } = req.params;
      const { password } = req.body;

      // Service boundary check
      if (!scope.isPlatformAdmin) {
        const accessCheck = await AppDataSource.query(
          `SELECT 1 FROM service_memberships WHERE user_id = $1 AND service_key = ANY($2) LIMIT 1`,
          [userId, scope.serviceKeys]
        );
        if (accessCheck.length === 0) {
          res.status(404).json({ success: false, error: 'User not found' });
          return;
        }
      }

      if (password) {
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);
        await AppDataSource.query(
          `UPDATE users SET password = $1, "updatedAt" = NOW() WHERE id = $2`,
          [hashedPassword, userId]
        );
      }

      res.json({ success: true, message: 'User updated' });
    } catch (error) {
      console.error('[MembershipConsole] updateMember error:', error);
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

      // Service boundary check
      if (!scope.isPlatformAdmin) {
        const accessCheck = await AppDataSource.query(
          `SELECT 1 FROM service_memberships WHERE user_id = $1 AND service_key = ANY($2) LIMIT 1`,
          [userId, scope.serviceKeys]
        );
        if (accessCheck.length === 0) {
          res.status(404).json({ success: false, error: 'User not found' });
          return;
        }
      }

      // Delete memberships first, then user (CASCADE should handle but be explicit)
      await AppDataSource.query(`DELETE FROM service_memberships WHERE user_id = $1`, [userId]);
      await AppDataSource.query(`DELETE FROM role_assignments WHERE user_id = $1`, [userId]);
      await AppDataSource.query(`DELETE FROM users WHERE id = $1`, [userId]);

      res.json({ success: true, message: 'User deleted' });
    } catch (error) {
      console.error('[MembershipConsole] deleteMember error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete member' });
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
      console.error('[MembershipConsole] getStats error:', error);
      res.json({ success: true, statistics: { total: 0, byStatus: [] } });
    }
  };
}
