import { apiClient } from './client';
export class UserApi {
    static async getUsers(page = 1, limit = 10, filters = {}) {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value && value !== 'all'))
        });
        const response = await apiClient.get(`/admin/users?${params}`);
        return response.data;
    }
    static async getPendingUsers(page = 1, limit = 10, businessType) {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            status: 'pending'
        });
        if (businessType && businessType !== 'all') {
            params.append('businessType', businessType);
        }
        const response = await apiClient.get(`/admin/users?${params}`);
        return response.data;
    }
    static async getUser(userId) {
        const response = await apiClient.get(`/admin/users/${userId}`);
        return response.data;
    }
    static async createUser(userData) {
        const response = await apiClient.post('/admin/users', userData);
        return response.data;
    }
    static async updateUser(userId, userData) {
        const response = await apiClient.put(`/admin/users/${userId}`, userData);
        return response.data;
    }
    static async approveUser(userId, notes) {
        const response = await apiClient.post(`/admin/users/${userId}/approve`, { notes });
        return response.data;
    }
    static async rejectUser(userId, reason) {
        const response = await apiClient.post(`/admin/users/${userId}/reject`, { reason });
        return response.data;
    }
    static async suspendUser(userId, reason) {
        const response = await apiClient.post(`/admin/users/${userId}/suspend`, { reason });
        return response.data;
    }
    static async reactivateUser(userId) {
        const response = await apiClient.post(`/admin/users/${userId}/reactivate`);
        return response.data;
    }
    static async deleteUser(userId) {
        const response = await apiClient.delete(`/admin/users/${userId}`);
        return response.data;
    }
    static async bulkAction(action) {
        const response = await apiClient.post('/admin/users/bulk', action);
        return response.data;
    }
    static async getUserStats() {
        const response = await apiClient.get('/admin/users/stats');
        return response.data;
    }
    static async exportUsers(filters = {}) {
        const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([_, value]) => value && value !== 'all')));
        const response = await apiClient.get(`/admin/users/export?${params}`, {
            responseType: 'blob'
        });
        return response.data;
    }
    static async getUserActivity(userId) {
        const response = await apiClient.get(`/admin/users/${userId}/activity`);
        return response.data;
    }
    static async migrateUserRoles() {
        const response = await apiClient.post('/admin/users/migrate-roles');
        return response.data;
    }
}
//# sourceMappingURL=userApi.js.map