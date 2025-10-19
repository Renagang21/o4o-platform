"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const typeorm_1 = require("typeorm");
const connection_1 = require("../database/connection");
const User_1 = require("../entities/User");
const ApprovalLog_1 = require("../entities/ApprovalLog");
class UserRepository extends typeorm_1.Repository {
    constructor() {
        super(User_1.User, connection_1.AppDataSource.manager);
    }
    // Create query builder with common relations
    createQueryBuilderWithRelations(alias = 'user') {
        return this.createQueryBuilder(alias)
            .leftJoinAndSelect(`${alias}.approvalLogs`, 'approvalLogs')
            .leftJoinAndSelect('approvalLogs.admin', 'approvalAdmin');
    }
    // Find users with filters and pagination
    async findWithFilters(filters, pagination) {
        const query = this.createQueryBuilderWithRelations();
        // Apply search filter
        if (filters.search) {
            query.andWhere(new typeorm_1.Brackets(qb => {
                qb.where('LOWER(user.email) LIKE LOWER(:search)', { search: `%${filters.search}%` })
                    .orWhere('LOWER(user.firstName) LIKE LOWER(:search)', { search: `%${filters.search}%` })
                    .orWhere('LOWER(user.lastName) LIKE LOWER(:search)', { search: `%${filters.search}%` })
                    .orWhere('LOWER(user.name) LIKE LOWER(:search)', { search: `%${filters.search}%` });
            }));
        }
        // Apply role filter
        if (filters.role) {
            if (Array.isArray(filters.role)) {
                query.andWhere('user.role IN (:...roles)', { roles: filters.role });
            }
            else {
                query.andWhere('user.role = :role', { role: filters.role });
            }
        }
        // Apply status filter
        if (filters.status) {
            if (Array.isArray(filters.status)) {
                query.andWhere('user.status IN (:...statuses)', { statuses: filters.status });
            }
            else {
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
            const { page, limit, sortBy = 'created_at', sortOrder = 'DESC' } = pagination;
            query
                .orderBy(`user.${sortBy}`, sortOrder)
                .skip((page - 1) * limit)
                .take(limit);
        }
        else {
            query.orderBy('user.createdAt', 'DESC');
        }
        const [users, total] = await query.getManyAndCount();
        return { users, total };
    }
    // Find pending approval users
    async findPendingApproval(pagination) {
        return this.findWithFilters({ status: User_1.UserStatus.PENDING }, pagination);
    }
    // Approve user
    async approveUser(userId, adminId, notes) {
        const user = await this.findOne({ where: { id: userId } });
        if (!user) {
            throw new Error('User not found');
        }
        // Update user status
        const previousStatus = user.status;
        user.status = User_1.UserStatus.APPROVED;
        user.approvedAt = new Date();
        user.approvedBy = adminId;
        await this.save(user);
        // Create approval log
        const approvalLogRepo = connection_1.AppDataSource.getRepository(ApprovalLog_1.ApprovalLog);
        await approvalLogRepo.save({
            user_id: userId,
            admin_id: adminId,
            action: 'approved',
            previous_status: previousStatus,
            new_status: User_1.UserStatus.APPROVED,
            notes
        });
        return user;
    }
    // Reject user
    async rejectUser(userId, adminId, notes) {
        const user = await this.findOne({ where: { id: userId } });
        if (!user) {
            throw new Error('User not found');
        }
        // Update user status
        const previousStatus = user.status;
        user.status = User_1.UserStatus.REJECTED;
        await this.save(user);
        // Create approval log
        const approvalLogRepo = connection_1.AppDataSource.getRepository(ApprovalLog_1.ApprovalLog);
        await approvalLogRepo.save({
            user_id: userId,
            admin_id: adminId,
            action: 'rejected',
            previous_status: previousStatus,
            new_status: User_1.UserStatus.REJECTED,
            notes
        });
        return user;
    }
    // Bulk approve users
    async bulkApprove(userIds, adminId, notes) {
        const users = await this.findByIds(userIds);
        const approvalLogs = [];
        for (const user of users) {
            if (user.status === User_1.UserStatus.PENDING) {
                const previousStatus = user.status;
                user.status = User_1.UserStatus.APPROVED;
                user.approvedAt = new Date();
                user.approvedBy = adminId;
                approvalLogs.push({
                    user_id: user.id,
                    admin_id: adminId,
                    action: 'approved',
                    previous_status: previousStatus,
                    new_status: User_1.UserStatus.APPROVED,
                    notes
                });
            }
        }
        await this.save(users);
        if (approvalLogs.length > 0) {
            const approvalLogRepo = connection_1.AppDataSource.getRepository(ApprovalLog_1.ApprovalLog);
            await approvalLogRepo.save(approvalLogs);
        }
        return approvalLogs.length;
    }
    // Bulk reject users
    async bulkReject(userIds, adminId, notes) {
        const users = await this.findByIds(userIds);
        const approvalLogs = [];
        for (const user of users) {
            if (user.status === User_1.UserStatus.PENDING) {
                const previousStatus = user.status;
                user.status = User_1.UserStatus.REJECTED;
                approvalLogs.push({
                    user_id: user.id,
                    admin_id: adminId,
                    action: 'rejected',
                    previous_status: previousStatus,
                    new_status: User_1.UserStatus.REJECTED,
                    notes
                });
            }
        }
        await this.save(users);
        if (approvalLogs.length > 0) {
            const approvalLogRepo = connection_1.AppDataSource.getRepository(ApprovalLog_1.ApprovalLog);
            await approvalLogRepo.save(approvalLogs);
        }
        return approvalLogs.length;
    }
    // Update user roles
    async updateUserRoles(userId, roles) {
        const user = await this.findOne({ where: { id: userId } });
        if (!user) {
            throw new Error('User not found');
        }
        user.roles = roles;
        // Keep primary role in sync
        user.role = roles[0] || User_1.UserRole.CUSTOMER;
        return this.save(user);
    }
    // Get user statistics
    async getUserStatistics() {
        const total = await this.count();
        const pending = await this.count({ where: { status: User_1.UserStatus.PENDING } });
        const active = await this.count({ where: { status: User_1.UserStatus.ACTIVE } });
        const rejected = await this.count({ where: { status: User_1.UserStatus.REJECTED } });
        // Count by role
        const roleStats = await this.createQueryBuilder('user')
            .select('user.role', 'role')
            .addSelect('COUNT(*)', 'count')
            .groupBy('user.role')
            .getRawMany();
        const byRole = roleStats.reduce((acc, stat) => {
            acc[stat.role] = parseInt(stat.count);
            return acc;
        }, {});
        return { total, pending, active, rejected, byRole };
    }
    // Find users by role
    async findByRole(role, pagination) {
        return this.findWithFilters({ role }, pagination);
    }
    // Soft delete user
    async softDeleteUser(userId) {
        await this.softDelete(userId);
    }
    // Restore soft deleted user
    async restoreUser(userId) {
        await this.restore(userId);
    }
}
exports.UserRepository = UserRepository;
//# sourceMappingURL=UserRepository.js.map