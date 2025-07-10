import { User, UserFilters, UserBulkAction, UserFormData, UserStats } from '@/types/user';
import { ApiResponse, PaginatedResponse } from '@/types';
export declare class UserApi {
    static getUsers(page?: number, limit?: number, filters?: UserFilters): Promise<PaginatedResponse<User>>;
    static getPendingUsers(page?: number, limit?: number, businessType?: string): Promise<PaginatedResponse<User>>;
    static getUser(userId: string): Promise<ApiResponse<User>>;
    static createUser(userData: UserFormData): Promise<ApiResponse<User>>;
    static updateUser(userId: string, userData: Partial<UserFormData>): Promise<ApiResponse<User>>;
    static approveUser(userId: string, notes?: string): Promise<ApiResponse<User>>;
    static rejectUser(userId: string, reason: string): Promise<ApiResponse<User>>;
    static suspendUser(userId: string, reason: string): Promise<ApiResponse<User>>;
    static reactivateUser(userId: string): Promise<ApiResponse<User>>;
    static deleteUser(userId: string): Promise<ApiResponse<void>>;
    static bulkAction(action: UserBulkAction): Promise<ApiResponse<void>>;
    static getUserStats(): Promise<ApiResponse<UserStats>>;
    static exportUsers(filters?: UserFilters): Promise<Blob>;
    static getUserActivity(userId: string): Promise<ApiResponse<any[]>>;
    static migrateUserRoles(): Promise<ApiResponse<void>>;
}
//# sourceMappingURL=userApi.d.ts.map