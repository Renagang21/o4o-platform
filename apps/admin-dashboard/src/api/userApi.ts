import { apiClient } from './client'
import { User, UserFilters, UserBulkAction, UserFormData, UserStats, UserActivityLog } from '@/types/user'
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

    const response = await apiClient.get(`/admin/users?${params}`)
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

    const response = await apiClient.get(`/admin/users?${params}`)
    return response.data
  }

  static async getUser(userId: string): Promise<ApiResponse<User>> {
    const response = await apiClient.get(`/admin/users/${userId}`)
    return response.data
  }

  static async createUser(userData: UserFormData): Promise<ApiResponse<User>> {
    const response = await apiClient.post('/admin/users', userData)
    return response.data
  }

  static async updateUser(userId: string, userData: Partial<UserFormData>): Promise<ApiResponse<User>> {
    const response = await apiClient.put(`/admin/users/${userId}`, userData)
    return response.data
  }

  static async approveUser(userId: string, notes?: string): Promise<ApiResponse<User>> {
    const response = await apiClient.post(`/admin/users/${userId}/approve`, { notes })
    return response.data
  }

  static async rejectUser(userId: string, reason: string): Promise<ApiResponse<User>> {
    const response = await apiClient.post(`/admin/users/${userId}/reject`, { reason })
    return response.data
  }

  static async suspendUser(userId: string, reason: string): Promise<ApiResponse<User>> {
    const response = await apiClient.post(`/admin/users/${userId}/suspend`, { reason })
    return response.data
  }

  static async reactivateUser(userId: string): Promise<ApiResponse<User>> {
    const response = await apiClient.post(`/admin/users/${userId}/reactivate`)
    return response.data
  }

  static async deleteUser(userId: string): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`/admin/users/${userId}`)
    return response.data
  }

  static async bulkAction(action: UserBulkAction): Promise<ApiResponse<void>> {
    const response = await apiClient.post('/admin/users/bulk', action)
    return response.data
  }

  static async getUserStats(): Promise<ApiResponse<UserStats>> {
    const response = await apiClient.get('/admin/users/stats')
    return response.data
  }

  static async exportUsers(filters: UserFilters = {}): Promise<Blob> {
    const params = new URLSearchParams(
      Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value && value !== 'all')
      )
    )

    const response = await apiClient.get(`/admin/users/export?${params}`, {
      responseType: 'blob'
    })
    return response.data
  }

  static async getUserActivity(userId: string): Promise<ApiResponse<UserActivityLog[]>> {
    const response = await apiClient.get(`/admin/users/${userId}/activity`)
    return response.data
  }

  // Legacy role migration helper
  static async migrateUserRoles(): Promise<ApiResponse<void>> {
    const response = await apiClient.post('/admin/users/migrate-roles')
    return response.data
  }
}