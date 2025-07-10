import { api } from './base';
export const policySettingsApi = {
    async getAllSettings() {
        try {
            const response = await api.get('/admin/policy-settings');
            return response.data;
        }
        catch (error) {
            console.error('Failed to fetch policy settings:', error);
            throw new Error('정책 설정을 불러올 수 없습니다.');
        }
    },
    async updatePartnerPolicies(settings) {
        try {
            const response = await api.put('/admin/policy-settings/partners', settings);
            return response.data;
        }
        catch (error) {
            console.error('Failed to update partner policies:', error);
            throw new Error('파트너스 정책 업데이트에 실패했습니다.');
        }
    },
    async updateSalesPolicies(settings) {
        try {
            const response = await api.put('/admin/policy-settings/sales', settings);
            return response.data;
        }
        catch (error) {
            console.error('Failed to update sales policies:', error);
            throw new Error('매출 정책 업데이트에 실패했습니다.');
        }
    },
    async updateInventoryPolicies(settings) {
        try {
            const response = await api.put('/admin/policy-settings/inventory', settings);
            return response.data;
        }
        catch (error) {
            console.error('Failed to update inventory policies:', error);
            throw new Error('재고 정책 업데이트에 실패했습니다.');
        }
    },
    async updateUserSecurityPolicies(settings) {
        try {
            const response = await api.put('/admin/policy-settings/users', settings);
            return response.data;
        }
        catch (error) {
            console.error('Failed to update user security policies:', error);
            throw new Error('사용자 보안 정책 업데이트에 실패했습니다.');
        }
    },
    async updateAllSettings(settings) {
        try {
            const response = await api.put('/admin/policy-settings', settings);
            return response.data;
        }
        catch (error) {
            console.error('Failed to update all policy settings:', error);
            throw new Error('정책 설정 일괄 업데이트에 실패했습니다.');
        }
    },
    async validateSettings(settings) {
        try {
            const response = await api.post('/admin/policy-settings/validate', settings);
            return response.data;
        }
        catch (error) {
            console.error('Failed to validate policy settings:', error);
            throw new Error('정책 설정 검증에 실패했습니다.');
        }
    },
    async getPolicyHistory(category, limit = 50) {
        try {
            const params = new URLSearchParams();
            if (category)
                params.append('category', category);
            params.append('limit', limit.toString());
            const response = await api.get(`/admin/policy-settings/history?${params}`);
            return response.data;
        }
        catch (error) {
            console.error('Failed to fetch policy history:', error);
            throw new Error('정책 변경 히스토리를 불러올 수 없습니다.');
        }
    },
    async exportSettings() {
        try {
            const response = await api.get('/admin/policy-settings/export', {
                responseType: 'blob'
            });
            return response.data;
        }
        catch (error) {
            console.error('Failed to export policy settings:', error);
            throw new Error('정책 설정 내보내기에 실패했습니다.');
        }
    },
    async importSettings(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await api.post('/admin/policy-settings/import', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return response.data;
        }
        catch (error) {
            console.error('Failed to import policy settings:', error);
            throw new Error('정책 설정 가져오기에 실패했습니다.');
        }
    },
    async resetToDefaults(category) {
        try {
            const params = category ? `?category=${category}` : '';
            const response = await api.post(`/admin/policy-settings/reset${params}`);
            return response.data;
        }
        catch (error) {
            console.error('Failed to reset policy settings:', error);
            throw new Error('정책 설정 초기화에 실패했습니다.');
        }
    },
    async getPolicyStats() {
        try {
            const response = await api.get('/admin/policy-settings/stats');
            return response.data;
        }
        catch (error) {
            console.error('Failed to fetch policy statistics:', error);
            throw new Error('정책 통계를 불러올 수 없습니다.');
        }
    },
    async testPolicyConfiguration(category, settings) {
        try {
            const response = await api.post(`/admin/policy-settings/test/${category}`, settings);
            return response.data;
        }
        catch (error) {
            console.error('Failed to test policy configuration:', error);
            throw new Error('정책 설정 테스트에 실패했습니다.');
        }
    },
    async getPolicyNotifications() {
        try {
            const response = await api.get('/admin/policy-settings/notifications');
            return response.data;
        }
        catch (error) {
            console.error('Failed to fetch policy notifications:', error);
            return [];
        }
    },
    async markNotificationAsRead(notificationId) {
        try {
            await api.put(`/admin/policy-settings/notifications/${notificationId}/read`);
        }
        catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    },
    async getPolicyTemplates() {
        try {
            const response = await api.get('/admin/policy-settings/templates');
            return response.data;
        }
        catch (error) {
            console.error('Failed to fetch policy templates:', error);
            return [];
        }
    },
    async applyPolicyTemplate(templateId) {
        try {
            const response = await api.post(`/admin/policy-settings/templates/${templateId}/apply`);
            return response.data;
        }
        catch (error) {
            console.error('Failed to apply policy template:', error);
            throw new Error('정책 템플릿 적용에 실패했습니다.');
        }
    },
    async savePolicyTemplate(template) {
        try {
            await api.post('/admin/policy-settings/templates', template);
        }
        catch (error) {
            console.error('Failed to save policy template:', error);
            throw new Error('정책 템플릿 저장에 실패했습니다.');
        }
    },
    async checkCompliance() {
        try {
            const response = await api.get('/admin/policy-settings/compliance');
            return response.data;
        }
        catch (error) {
            console.error('Failed to check policy compliance:', error);
            throw new Error('정책 준수 검사에 실패했습니다.');
        }
    },
    async createBackup(name) {
        try {
            const response = await api.post('/admin/policy-settings/backup', { name });
            return response.data;
        }
        catch (error) {
            console.error('Failed to create policy backup:', error);
            throw new Error('정책 백업 생성에 실패했습니다.');
        }
    },
    async getBackups() {
        try {
            const response = await api.get('/admin/policy-settings/backups');
            return response.data;
        }
        catch (error) {
            console.error('Failed to fetch policy backups:', error);
            return [];
        }
    },
    async restoreBackup(backupId) {
        try {
            const response = await api.post(`/admin/policy-settings/backup/${backupId}/restore`);
            return response.data;
        }
        catch (error) {
            console.error('Failed to restore policy backup:', error);
            throw new Error('정책 백업 복원에 실패했습니다.');
        }
    },
    getMockSettings() {
        return {
            partners: {
                autoApproval: false,
                commissionRate: 5.0,
                tierLevels: [
                    { name: '브론즈', minSales: 0, commissionRate: 3.0 },
                    { name: '실버', minSales: 1000000, commissionRate: 5.0 },
                    { name: '골드', minSales: 5000000, commissionRate: 7.0 },
                    { name: '플래티넘', minSales: 10000000, commissionRate: 10.0 }
                ]
            },
            sales: {
                monthlyTarget: 50000000,
                alertThreshold: 80,
                bonusThreshold: 110
            },
            inventory: {
                lowStockThreshold: 10,
                criticalStockThreshold: 3,
                autoReorder: false
            },
            users: {
                requireApproval: true,
                sessionTimeout: 8,
                passwordPolicy: {
                    minLength: 8,
                    requireSpecialChars: true
                }
            }
        };
    },
    getMockHistory() {
        return [
            {
                id: '1',
                category: 'partners',
                action: 'update',
                changes: { commissionRate: { from: 3.0, to: 5.0 } },
                userId: 'admin-1',
                userName: '관리자',
                timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
                description: '파트너 기본 커미션 비율을 3%에서 5%로 변경'
            },
            {
                id: '2',
                category: 'sales',
                action: 'update',
                changes: { monthlyTarget: { from: 40000000, to: 50000000 } },
                userId: 'manager-1',
                userName: '영업매니저',
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
                description: '월 매출 목표를 4천만원에서 5천만원으로 상향 조정'
            },
            {
                id: '3',
                category: 'inventory',
                action: 'update',
                changes: { lowStockThreshold: { from: 5, to: 10 } },
                userId: 'admin-1',
                userName: '관리자',
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
                description: '재고 부족 임계값을 5개에서 10개로 변경'
            },
            {
                id: '4',
                category: 'users',
                action: 'update',
                changes: { 'passwordPolicy.minLength': { from: 6, to: 8 } },
                userId: 'security-admin',
                userName: '보안관리자',
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
                description: '비밀번호 최소 길이를 6자에서 8자로 강화'
            },
            {
                id: '5',
                category: 'partners',
                action: 'create',
                changes: { tierLevels: { added: { name: '플래티넘', minSales: 10000000, commissionRate: 10.0 } } },
                userId: 'admin-1',
                userName: '관리자',
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
                description: '플래티넘 파트너 등급 신규 추가'
            }
        ];
    }
};
//# sourceMappingURL=policy-settings.js.map