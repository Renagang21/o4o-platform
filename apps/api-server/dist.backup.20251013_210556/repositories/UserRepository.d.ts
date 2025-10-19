import { Repository, SelectQueryBuilder } from 'typeorm';
import { User, UserRole, UserStatus } from '../entities/User';
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
export declare class UserRepository extends Repository<User> {
    constructor();
    createQueryBuilderWithRelations(alias?: string): SelectQueryBuilder<User>;
    findWithFilters(filters: UserFilters, pagination?: PaginationOptions): Promise<{
        users: User[];
        total: number;
    }>;
    findPendingApproval(pagination?: PaginationOptions): Promise<{
        users: User[];
        total: number;
    }>;
    approveUser(userId: string, adminId: string, notes?: string): Promise<User>;
    rejectUser(userId: string, adminId: string, notes?: string): Promise<User>;
    bulkApprove(userIds: string[], adminId: string, notes?: string): Promise<number>;
    bulkReject(userIds: string[], adminId: string, notes?: string): Promise<number>;
    updateUserRoles(userId: string, roles: UserRole[]): Promise<User>;
    getUserStatistics(): Promise<{
        total: number;
        pending: number;
        active: number;
        rejected: number;
        byRole: Record<string, number>;
    }>;
    findByRole(role: UserRole, pagination?: PaginationOptions): Promise<{
        users: User[];
        total: number;
    }>;
    softDeleteUser(userId: string): Promise<void>;
    restoreUser(userId: string): Promise<void>;
}
//# sourceMappingURL=UserRepository.d.ts.map