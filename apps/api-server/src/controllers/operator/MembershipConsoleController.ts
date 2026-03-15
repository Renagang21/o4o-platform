/**
 * MembershipConsoleController — Extension Layer
 * WO-O4O-MEMBERSHIP-CONSOLE-V1
 *
 * Operator 회원 콘솔: 사용자 + service_memberships + role_assignments 통합 조회
 * Core Freeze F10 준수: AdminUserController/users.routes 미수정, Extension 엔드포인트 사용
 */
import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';

export class MembershipConsoleController {

  /**
   * GET /api/v1/operator/members
   * 회원 목록 + service_memberships + role_assignments
   */
  getMembers = async (req: Request, res: Response): Promise<void> => {
    try {
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

      if (serviceKey && serviceKey !== 'all') {
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

      // Batch fetch service_memberships
      const membershipRows = await AppDataSource.query(
        `SELECT id, user_id, service_key, status, role, approved_by, approved_at, rejection_reason, created_at
         FROM service_memberships
         WHERE user_id = ANY($1)
         ORDER BY created_at DESC`,
        [userIds]
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
      const { userId } = req.params;

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

      // Fetch service_memberships
      const membershipRows = await AppDataSource.query(
        `SELECT id, service_key, status, role, approved_by, approved_at, rejection_reason, created_at, updated_at
         FROM service_memberships
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
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
      const { membershipId } = req.params;
      const approvedBy = (req as any).user?.id || null;

      const result = await AppDataSource.query(
        `UPDATE service_memberships
         SET status = 'active', approved_by = $1, approved_at = NOW(), updated_at = NOW()
         WHERE id = $2 AND status IN ('pending', 'rejected')
         RETURNING id, user_id, service_key, status`,
        [approvedBy, membershipId]
      );

      if (result.length === 0) {
        res.status(404).json({ success: false, error: 'Membership not found or already active' });
        return;
      }

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
      const { membershipId } = req.params;
      const { reason } = req.body;

      const result = await AppDataSource.query(
        `UPDATE service_memberships
         SET status = 'rejected', rejection_reason = $1, updated_at = NOW()
         WHERE id = $2 AND status IN ('pending', 'active')
         RETURNING id, user_id, service_key, status`,
        [reason || null, membershipId]
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
}
