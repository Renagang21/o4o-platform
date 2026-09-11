import { unifiedApi } from './unified-client'
import { User, UserFilters, UserBulkAction, UserFormData, UserActivityLog } from '@/types/user'
import { ApiResponse, PaginatedResponse } from '@/types'

export class UserApi {
  static async getUsers(
    page = 1,
    limit = 10,
    filters: UserFilters = {}
  ): Promise<PaginatedResponse<User>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value && value !== 'all')
      )
    })

    const response = await unifiedApi.raw.get(`/v1/users?${params}`)

    // Backend returns data in response.data.data structure
    if (response.data?.data?.users) {
      return {
        data: response.data.data.users,
        total: response.data.data.pagination?.totalItems || 0,
        totalPages: response.data.data.pagination?.total || 0,
        pagination: response.data.data.pagination
      }
    }

    return response.data
  }

  static async getPendingUsers(
    page = 1,
    limit = 10,
    businessType?: string
  ): Promise<PaginatedResponse<User>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      status: 'pending'
    })

    if (businessType && businessType !== 'all') {
      params.append('businessType', businessType)
    }

    const response = await unifiedApi.raw.get(`/v1/users?${params}`)
    return response.data
  }

  static async getUser(userId: string): Promise<ApiResponse<User>> {
    const response = await unifiedApi.raw.get(`/v1/users/${userId}`)
    return response.data
  }

  static async createUser(userData: UserFormData): Promise<ApiResponse<User>> {
    const response = await unifiedApi.raw.post('/v1/users', userData)
    return response.data
  }

  static async updateUser(userId: string, userData: Partial<UserFormData>): Promise<ApiResponse<User>> {
    const response = await unifiedApi.raw.put(`/v1/users/${userId}`, userData)
    return response.data
  }

  // WO-O4O-ADMIN-DASHBOARD-LEGACY-ROUTE-API-AND-NAVIGATION-CLOSURE-V1:
  //   approve/reject 는 `/admin/users/*` (backend 없음, /api/admin/… 404) 를 호출하고 있었다.
  //   backend 계약은 `POST /api/v1/users/:id/approve|reject` (users.routes.ts) → prefix 수정.
  //   suspend/reactivate 주석 코드 · migrateUserRoles(`/admin/users/migrate-roles`, backend 없음·소비처 0) 제거.
  static async approveUser(userId: string, notes?: string): Promise<ApiResponse<User>> {
    const response = await unifiedApi.raw.post(`/v1/users/${userId}/approve`, { notes })
    return response.data
  }

  static async rejectUser(userId: string, reason: string): Promise<ApiResponse<User>> {
    const response = await unifiedApi.raw.post(`/v1/users/${userId}/reject`, { notes: reason })
    return response.data
  }

  static async deleteUser(userId: string): Promise<ApiResponse<void>> {
    const response = await unifiedApi.raw.delete(`/v1/users/${userId}`)
    return response.data
  }

  static async bulkAction(action: UserBulkAction): Promise<ApiResponse<void>> {
    const endpoint = action.action === 'approve' ? '/v1/users/bulk-approve' : '/v1/users/bulk-reject'
    const response = await unifiedApi.raw.post(endpoint, {
      userIds: action.userIds,
      notes: action.reason || 'Bulk action via admin dashboard'
    })
    return response.data
  }

  static async exportUsers(filters: UserFilters = {}): Promise<Blob> {
    const params = new URLSearchParams(
      Object.fromEntries(
        Object.entries(filters)
          .filter(([_, value]) => value && value !== 'all')
          .map(([key, value]) => [key, String(value)])
      )
    )

    const response = await unifiedApi.raw.get(`/v1/users/export/csv?${params}`, {
      responseType: 'blob'
    })
    return response.data
  }

  static async getUserActivity(userId: string): Promise<ApiResponse<UserActivityLog[]>> {
    const response = await unifiedApi.raw.get(`/v1/users/${userId}/approval-history`)
    return response.data
  }

}