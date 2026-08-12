import { Request, Response } from 'express';
import { UserRepository, UserFilters, PaginationOptions } from '../repositories/UserRepository.js';
import { ApprovalLog } from '../entities/ApprovalLog.js';
import { AppDataSource } from '../database/connection.js';
import type { AuthRequest } from '../types/auth.js';
import { Parser } from 'json2csv';
import { roleAssignmentService } from '../modules/auth/services/role-assignment.service.js';
import logger from '../utils/logger.js';

export class UserManagementController {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  // Get all users with filters
  getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { search, role, status, dateFrom, dateTo, page = 1, limit = 20, sortBy, sortOrder } = req.query;

      // Return empty data if database is not initialized
      if (!AppDataSource.isInitialized) {
        res.json({
          success: true,
          data: {
            users: [],
            pagination: {
              total: 0,
              page: Number(page),
              limit: Number(limit),
              totalPages: 0
            }
          }
        });
        return;
      }

      const filters: UserFilters = {
        search: search as string,
        role: role ? (Array.isArray(role) ? role as string[] : [role as string]) as any : undefined,
        status: status ? (Array.isArray(status) ? status as string[] : [status as string]) as any : undefined,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined
      };

      const pagination: PaginationOptions = {
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'ASC' | 'DESC'
      };

      const { users, total } = await this.userRepository.findWithFilters(filters, pagination);

      res.json({
        success: true,
        data: {
          users: users.map((user: any) => user.toPublicData()),
          pagination: {
            total,
            page: pagination.page,
            limit: pagination.limit,
            totalPages: Math.ceil(total / pagination.limit)
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching users:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  // Get pending approval users
  getPendingUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page = 1, limit = 20 } = req.query;

      const pagination: PaginationOptions = {
        page: Number(page),
        limit: Number(limit)
      };

      const { users, total } = await this.userRepository.findPendingApproval(pagination);

      res.json({
        success: true,
        data: {
          users: users.map((user: any) => user.toPublicData()),
          pagination: {
            total,
            page: pagination.page,
            limit: pagination.limit,
            totalPages: Math.ceil(total / pagination.limit)
          }
        }
      });
    } catch (error) {
      logger.error('Error getting pending users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get pending users',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  // Get single user
  getUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Simple findOne without approvalLogs relation (table doesn't exist yet)
      const user = await this.userRepository.findOne({
        where: { id }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      res.json({
        success: true,
        data: user.toPublicData()
      });
    } catch (error) {
      logger.error('Error getting user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  };

  // Create new user
  createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, firstName, lastName, role, roles, status } = req.body;

      // Check if user already exists
      const existingUser = await this.userRepository.findOne({ where: { email } });
      if (existingUser) {
        res.status(400).json({
          success: false,
          error: 'User with this email already exists'
        });
        return;
      }

      // Create new user
      const user = this.userRepository.create({
        email,
        password,
        firstName,
        lastName,
        roles: roles || [role || 'customer'],
        status: status || 'pending'
      });

      const savedUser = await this.userRepository.save(user);

      res.status(201).json({
        success: true,
        data: savedUser.toPublicData()
      });
    } catch (error) {
      logger.error('Error creating user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create user',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  // Update user
  updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { email, firstName, lastName, status, roles, password } = req.body;

      // IR-O4O-SERVICE-MEMBER-PASSWORD-AND-ROLE-CONSUMER-INTEGRITY-AUDIT-V1 (FIX-1)
      //   이 엔드포인트(PUT /api/v1/users/:id)는 비밀번호를 쓰지 않는다.
      //   그런데 admin-dashboard 의 사용자 편집 화면이 password 를 함께 보내고 있었고,
      //   여기서 destructure 하지 않아 **조용히 무시**됐다 — 화면에는 성공으로 보이지만
      //   users.password 도 service_credentials 도 바뀌지 않는 "성공했는데 안 바뀜" 상태다.
      //   AdminUserController.updateUser 와 동일한 계약으로 **명시적으로 거부**한다.
      if (password !== undefined) {
        res.status(400).json({
          success: false,
          error:
            '이 API 는 비밀번호를 변경하지 않습니다. 서비스 비밀번호는 운영자 회원 관리(서비스 선택 후 변경), ' +
            '플랫폼 계정 비밀번호는 플랫폼 계정 관리에서 변경하세요.',
          code: 'PASSWORD_NOT_ALLOWED_HERE',
        });
        return;
      }

      const user = await this.userRepository.findOne({ where: { id } });
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Update user fields
      if (email) user.email = email;
      if (firstName !== undefined) user.firstName = firstName;
      if (lastName !== undefined) user.lastName = lastName;
      if (status) user.status = status;
      if (roles) {
        await roleAssignmentService.removeAllRoles(user.id);
        await roleAssignmentService.assignRoles(user.id, roles);
      }

      const updatedUser = await this.userRepository.save(user);

      res.json({
        success: true,
        data: updatedUser.toPublicData()
      });
    } catch (error) {
      logger.error('Error updating user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  // Delete user (soft delete)
  deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const user = await this.userRepository.findOne({ where: { id } });
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      await this.userRepository.softDeleteUser(id);

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete user',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  // Approve user
  approveUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const adminId = (req.user as any)?.id || (req.user as any)?.userId;

      if (!adminId) {
        res.status(401).json({
          success: false,
          error: 'Admin ID not found'
        });
        return;
      }

      const user = await this.userRepository.approveUser(id, adminId, notes);

      res.json({
        success: true,
        data: user.toPublicData()
      });
    } catch (error) {
      logger.error('Error approving user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to approve user',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  // Reject user
  rejectUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const adminId = (req.user as any)?.id || (req.user as any)?.userId;

      if (!adminId) {
        res.status(401).json({
          success: false,
          error: 'Admin ID not found'
        });
        return;
      }

      const user = await this.userRepository.rejectUser(id, adminId, notes);

      res.json({
        success: true,
        data: user.toPublicData()
      });
    } catch (error) {
      logger.error('Error rejecting user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reject user',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  // Bulk approve users
  bulkApprove = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { userIds, notes } = req.body;
      const adminId = (req.user as any)?.id || (req.user as any)?.userId;

      if (!adminId) {
        res.status(401).json({
          success: false,
          error: 'Admin ID not found'
        });
        return;
      }

      const count = await this.userRepository.bulkApprove(userIds, adminId, notes);

      res.json({
        success: true,
        data: {
          approvedCount: count
        }
      });
    } catch (error) {
      logger.error('Error bulk approving users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to bulk approve users',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  // Bulk reject users
  bulkReject = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { userIds, notes } = req.body;
      const adminId = (req.user as any)?.id || (req.user as any)?.userId;

      if (!adminId) {
        res.status(401).json({
          success: false,
          error: 'Admin ID not found'
        });
        return;
      }

      const count = await this.userRepository.bulkReject(userIds, adminId, notes);

      res.json({
        success: true,
        data: {
          rejectedCount: count
        }
      });
    } catch (error) {
      logger.error('Error bulk rejecting users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to bulk reject users',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  // Update user roles
  updateUserRoles = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { roles } = req.body;

      const user = await this.userRepository.updateUserRoles(id, roles);

      res.json({
        success: true,
        data: user.toPublicData()
      });
    } catch (error) {
      logger.error('Error updating user roles:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user roles',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  // Get user approval history
  getUserApprovalHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Return empty array until approval_logs table is created
      // TODO: Create approval_logs table via migration
      res.json({
        success: true,
        data: []
      });
    } catch (error) {
      logger.error('Error getting approval history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get approval history',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  // Export users to CSV
  exportUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { search, role, status } = req.query;

      const filters: UserFilters = {
        search: search as string,
        role: role ? (Array.isArray(role) ? role as string[] : [role as string]) as any : undefined,
        status: status ? (Array.isArray(status) ? status as string[] : [status as string]) as any : undefined
      };

      const { users } = await this.userRepository.findWithFilters(filters);

      // Prepare data for CSV
      const csvData = users.map((user: any) => ({
        ID: user.id,
        Email: user.email,
        'First Name': user.firstName || '',
        'Last Name': user.lastName || '',
        'Full Name': user.fullName,
        Role: user.roles?.[0],
        Roles: user.roles.join(', '),
        Status: user.status,
        'Email Verified': user.isEmailVerified ? 'Yes' : 'No',
        'Created At': user.createdAt.toISOString(),
        'Last Login': user.lastLoginAt?.toISOString() || 'Never'
      }));

      // Convert to CSV
      const parser = new Parser();
      const csv = parser.parse(csvData);

      // Set response headers
      // charset + BOM 이 없으면 Excel 이 시스템 기본 인코딩(한국어 Windows=CP949)으로 읽어
      // 한글 이름·조직명이 깨진다.
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=users-export.csv');

      res.send('\ufeff' + csv);
    } catch (error) {
      logger.error('Error exporting users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export users',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };
}