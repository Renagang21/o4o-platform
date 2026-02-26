import { Repository, SelectQueryBuilder, Brackets } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { User, UserRole, UserStatus } from '../entities/User.js';
import { ApprovalLog } from '../entities/ApprovalLog.js';

export interface UserFilters {
  search?: string;
  role?: UserRole | UserRole[];
  status?: UserStatus | UserStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  isActive?: boolean;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export class UserRepository extends Repository<User> {
  constructor() {
    super(User, AppDataSource.manager);
  }

  // Create query builder with common relations
  createQueryBuilderWithRelations(alias: string = 'user'): SelectQueryBuilder<User> {
    return this.createQueryBuilder(alias)
      .leftJoinAndSelect(`${alias}.approvalLogs`, 'approvalLogs')
      .leftJoinAndSelect('approvalLogs.admin', 'approvalAdmin');
  }

  // Find users with filters and pagination
  async findWithFilters(
    filters: UserFilters,
    pagination?: PaginationOptions
  ): Promise<{ users: User[]; total: number }> {
    const query = this.createQueryBuilder('user');

    // Apply search filter
    if (filters.search) {
      query.andWhere(
        new Brackets(qb => {
          qb.where('LOWER(user.email) LIKE LOWER(:search)', { search: `%${filters.search}%` })
            .orWhere('LOWER(user.firstName) LIKE LOWER(:search)', { search: `%${filters.search}%` })
            .orWhere('LOWER(user.lastName) LIKE LOWER(:search)', { search: `%${filters.search}%` })
            .orWhere('LOWER(user.name) LIKE LOWER(:search)', { search: `%${filters.search}%` });
        })
      );
    }

    // Apply role filter
    if (filters.role) {
      if (Array.isArray(filters.role)) {
        query.andWhere(`EXISTS (SELECT 1 FROM role_assignments ra WHERE ra.user_id = user.id AND ra.is_active = true AND ra.role IN (:...roles))`, { roles: filters.role });
      } else {
        query.andWhere(`EXISTS (SELECT 1 FROM role_assignments ra WHERE ra.user_id = user.id AND ra.is_active = true AND ra.role = :role)`, { role: filters.role });
      }
    }

    // Apply status filter
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query.andWhere('user.status IN (:...statuses)', { statuses: filters.status });
      } else {
        query.andWhere('user.status = :status', { status: filters.status });
      }
    }

    // Apply date filters
    if (filters.dateFrom) {
      query.andWhere('user.createdAt >= :dateFrom', { dateFrom: filters.dateFrom });
    }
    if (filters.dateTo) {
      query.andWhere('user.createdAt <= :dateTo', { dateTo: filters.dateTo });
    }

    // Apply active filter
    if (filters.isActive !== undefined) {
      query.andWhere('user.isActive = :isActive', { isActive: filters.isActive });
    }

    // Apply pagination and sorting
    if (pagination) {
      const { page, limit, sortBy = 'createdAt', sortOrder = 'DESC' } = pagination;
      query
        .orderBy(`user.${sortBy}`, sortOrder)
        .skip((page - 1) * limit)
        .take(limit);
    } else {
      query.orderBy('user.createdAt', 'DESC');
    }

    const [users, total] = await query.getManyAndCount();

    return { users, total };
  }

  // Find pending approval users
  async findPendingApproval(pagination?: PaginationOptions): Promise<{ users: User[]; total: number }> {
    return this.findWithFilters({ status: UserStatus.PENDING }, pagination);
  }

  // Approve user
  async approveUser(userId: string, adminId: string, notes?: string): Promise<User> {
    const user = await this.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // Update user status
    const previousStatus = user.status;
    user.status = UserStatus.APPROVED;
    user.approvedAt = new Date();
    user.approvedBy = adminId;
    await this.save(user);

    // Create approval log
    const approvalLogRepo = AppDataSource.getRepository(ApprovalLog);
    await approvalLogRepo.save({
      user_id: userId,
      admin_id: adminId,
      action: 'approved',
      previous_status: previousStatus,
      new_status: UserStatus.APPROVED,
      notes
    });

    return user;
  }

  // Reject user
  async rejectUser(userId: string, adminId: string, notes?: string): Promise<User> {
    const user = await this.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // Update user status
    const previousStatus = user.status;
    user.status = UserStatus.REJECTED;
    await this.save(user);

    // Create approval log
    const approvalLogRepo = AppDataSource.getRepository(ApprovalLog);
    await approvalLogRepo.save({
      user_id: userId,
      admin_id: adminId,
      action: 'rejected',
      previous_status: previousStatus,
      new_status: UserStatus.REJECTED,
      notes
    });

    return user;
  }

  // Bulk approve users
  async bulkApprove(userIds: string[], adminId: string, notes?: string): Promise<number> {
    const users = await this.findByIds(userIds);
    const approvalLogs: Partial<ApprovalLog>[] = [];

    for (const user of users) {
      if (user.status === UserStatus.PENDING) {
        const previousStatus = user.status;
        user.status = UserStatus.APPROVED;
        user.approvedAt = new Date();
        user.approvedBy = adminId;

        approvalLogs.push({
          user_id: user.id,
          admin_id: adminId,
          action: 'approved',
          previous_status: previousStatus,
          new_status: UserStatus.APPROVED,
          notes
        });
      }
    }

    await this.save(users);

    if (approvalLogs.length > 0) {
      const approvalLogRepo = AppDataSource.getRepository(ApprovalLog);
      await approvalLogRepo.save(approvalLogs);
    }

    return approvalLogs.length;
  }

  // Bulk reject users
  async bulkReject(userIds: string[], adminId: string, notes?: string): Promise<number> {
    const users = await this.findByIds(userIds);
    const approvalLogs: Partial<ApprovalLog>[] = [];

    for (const user of users) {
      if (user.status === UserStatus.PENDING) {
        const previousStatus = user.status;
        user.status = UserStatus.REJECTED;

        approvalLogs.push({
          user_id: user.id,
          admin_id: adminId,
          action: 'rejected',
          previous_status: previousStatus,
          new_status: UserStatus.REJECTED,
          notes
        });
      }
    }

    await this.save(users);

    if (approvalLogs.length > 0) {
      const approvalLogRepo = AppDataSource.getRepository(ApprovalLog);
      await approvalLogRepo.save(approvalLogs);
    }

    return approvalLogs.length;
  }

  // Update user roles
  async updateUserRoles(userId: string, roles: UserRole[]): Promise<User> {
    const user = await this.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // Phase3-E: user.roles not persisted to DB, user.role is read-only getter
    // Role changes handled via RoleAssignment dual-write below

    const savedUser = await this.save(user);

    // Phase3-D: Dual-write RoleAssignment
    try {
      const { roleAssignmentService } = await import('../modules/auth/services/role-assignment.service.js');
      for (const r of roles) {
        await roleAssignmentService.assignRole({
          userId,
          role: r,
        });
      }
    } catch {
      // Non-fatal
    }

    return savedUser;
  }

  // Get user statistics
  async getUserStatistics(): Promise<{
    total: number;
    pending: number;
    active: number;
    rejected: number;
    byRole: Record<string, number>;
  }> {
    const total = await this.count();
    const pending = await this.count({ where: { status: UserStatus.PENDING } });
    const active = await this.count({ where: { status: UserStatus.ACTIVE } });
    const rejected = await this.count({ where: { status: UserStatus.REJECTED } });

    // Count by role
    const roleStats = await this.createQueryBuilder('user')
      .innerJoin('role_assignments', 'ra', 'ra.user_id = user.id AND ra.is_active = true')
      .select('ra.role', 'role')
      .addSelect('COUNT(DISTINCT user.id)', 'count')
      .groupBy('ra.role')
      .getRawMany();

    const byRole = roleStats.reduce((acc, stat) => {
      acc[stat.role] = parseInt(stat.count);
      return acc;
    }, {} as Record<string, number>);

    return { total, pending, active, rejected, byRole };
  }

  // Find users by role
  async findByRole(role: UserRole, pagination?: PaginationOptions): Promise<{ users: User[]; total: number }> {
    return this.findWithFilters({ role }, pagination);
  }

  // Soft delete user
  async softDeleteUser(userId: string): Promise<void> {
    await this.softDelete(userId);
  }

  // Restore soft deleted user
  async restoreUser(userId: string): Promise<void> {
    await this.restore(userId);
  }
}