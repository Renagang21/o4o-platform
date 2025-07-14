/**
 * Policy Settings API Client
 * 정책 설정 시스템용 API 클라이언트
 */

import { api } from './base';

// Types
export interface PolicySettings {
  partners: PartnerPolicySettings;
  sales: SalesPolicySettings;
  inventory: InventoryPolicySettings;
  users: UserSecurityPolicySettings;
}

export interface PartnerPolicySettings {
  autoApproval: boolean;
  commissionRate: number;
  tierLevels: Array<{
    name: string;
    minSales: number;
    commissionRate: number;
  }>;
}

export interface SalesPolicySettings {
  monthlyTarget: number;
  alertThreshold: number;
  bonusThreshold: number;
}

export interface InventoryPolicySettings {
  lowStockThreshold: number;
  criticalStockThreshold: number;
  autoReorder: boolean;
}

export interface UserSecurityPolicySettings {
  requireApproval: boolean;
  sessionTimeout: number;
  passwordPolicy: {
    minLength: number;
    requireSpecialChars: boolean;
  };
}

export interface PolicyHistory {
  id: string;
  category: string;
  action: 'create' | 'update' | 'delete';
  changes: Record<string, unknown>;
  userId: string;
  userName: string;
  timestamp: string;
  description: string;
}

export interface PolicyValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
}

// Policy Settings API
export const policySettingsApi = {
  // Get all policy settings
  async getAllSettings(): Promise<PolicySettings> {
    try {
      const response = await api.get('/admin/policy-settings');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch policy settings:', error);
      throw new Error('정책 설정을 불러올 수 없습니다.');
    }
  },

  // Update specific policy category
  async updatePartnerPolicies(settings: Partial<PartnerPolicySettings>): Promise<PartnerPolicySettings> {
    try {
      const response = await api.put('/admin/policy-settings/partners', settings);
      return response.data;
    } catch (error) {
      console.error('Failed to update partner policies:', error);
      throw new Error('파트너스 정책 업데이트에 실패했습니다.');
    }
  },

  async updateSalesPolicies(settings: Partial<SalesPolicySettings>): Promise<SalesPolicySettings> {
    try {
      const response = await api.put('/admin/policy-settings/sales', settings);
      return response.data;
    } catch (error) {
      console.error('Failed to update sales policies:', error);
      throw new Error('매출 정책 업데이트에 실패했습니다.');
    }
  },

  async updateInventoryPolicies(settings: Partial<InventoryPolicySettings>): Promise<InventoryPolicySettings> {
    try {
      const response = await api.put('/admin/policy-settings/inventory', settings);
      return response.data;
    } catch (error) {
      console.error('Failed to update inventory policies:', error);
      throw new Error('재고 정책 업데이트에 실패했습니다.');
    }
  },

  async updateUserSecurityPolicies(settings: Partial<UserSecurityPolicySettings>): Promise<UserSecurityPolicySettings> {
    try {
      const response = await api.put('/admin/policy-settings/users', settings);
      return response.data;
    } catch (error) {
      console.error('Failed to update user security policies:', error);
      throw new Error('사용자 보안 정책 업데이트에 실패했습니다.');
    }
  },

  // Bulk update all settings
  async updateAllSettings(settings: Partial<PolicySettings>): Promise<PolicySettings> {
    try {
      const response = await api.put('/admin/policy-settings', settings);
      return response.data;
    } catch (error) {
      console.error('Failed to update all policy settings:', error);
      throw new Error('정책 설정 일괄 업데이트에 실패했습니다.');
    }
  },

  // Validate policy settings
  async validateSettings(settings: Partial<PolicySettings>): Promise<PolicyValidationResult> {
    try {
      const response = await api.post('/admin/policy-settings/validate', settings);
      return response.data;
    } catch (error) {
      console.error('Failed to validate policy settings:', error);
      throw new Error('정책 설정 검증에 실패했습니다.');
    }
  },

  // Policy history and audit
  async getPolicyHistory(category?: string, limit: number = 50): Promise<PolicyHistory[]> {
    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      params.append('limit', limit.toString());

      const response = await api.get(`/admin/policy-settings/history?${params}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch policy history:', error);
      throw new Error('정책 변경 히스토리를 불러올 수 없습니다.');
    }
  },

  // Export/Import settings
  async exportSettings(): Promise<Blob> {
    try {
      const response = await api.get('/admin/policy-settings/export', {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Failed to export policy settings:', error);
      throw new Error('정책 설정 내보내기에 실패했습니다.');
    }
  },

  async importSettings(file: File): Promise<PolicySettings> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/admin/policy-settings/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to import policy settings:', error);
      throw new Error('정책 설정 가져오기에 실패했습니다.');
    }
  },

  // Reset to default settings
  async resetToDefaults(category?: string): Promise<PolicySettings> {
    try {
      const params = category ? `?category=${category}` : '';
      const response = await api.post(`/admin/policy-settings/reset${params}`);
      return response.data;
    } catch (error) {
      console.error('Failed to reset policy settings:', error);
      throw new Error('정책 설정 초기화에 실패했습니다.');
    }
  },

  // Get policy statistics
  async getPolicyStats(): Promise<{
    partners: {
      totalPartners: number;
      pendingApproval: number;
      averageCommission: number;
      tierDistribution: Record<string, number>;
    };
    sales: {
      currentMonthProgress: number;
      targetAchievementRate: number;
      alertsTriggered: number;
      bonusEligible: number;
    };
    inventory: {
      lowStockItems: number;
      criticalStockItems: number;
      autoReorderEnabled: number;
      totalValue: number;
    };
    users: {
      totalUsers: number;
      pendingApproval: number;
      twoFactorEnabled: number;
      securityScore: number;
    };
  }> {
    try {
      const response = await api.get('/admin/policy-settings/stats');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch policy statistics:', error);
      throw new Error('정책 통계를 불러올 수 없습니다.');
    }
  },

  // Test policy configurations
  async testPolicyConfiguration(category: string, settings: Record<string, unknown>): Promise<{
    success: boolean;
    results: Array<{
      test: string;
      passed: boolean;
      message: string;
    }>;
  }> {
    try {
      const response = await api.post(`/admin/policy-settings/test/${category}`, settings);
      return response.data;
    } catch (error) {
      console.error('Failed to test policy configuration:', error);
      throw new Error('정책 설정 테스트에 실패했습니다.');
    }
  },

  // Policy notifications
  async getPolicyNotifications(): Promise<Array<{
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    category: string;
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
  }>> {
    try {
      const response = await api.get('/admin/policy-settings/notifications');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch policy notifications:', error);
      return [];
    }
  },

  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      await api.put(`/admin/policy-settings/notifications/${notificationId}/read`);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  },

  // Policy templates
  async getPolicyTemplates(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    settings: Record<string, unknown>;
    isDefault: boolean;
  }>> {
    try {
      const response = await api.get('/admin/policy-settings/templates');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch policy templates:', error);
      return [];
    }
  },

  async applyPolicyTemplate(templateId: string): Promise<PolicySettings> {
    try {
      const response = await api.post(`/admin/policy-settings/templates/${templateId}/apply`);
      return response.data;
    } catch (error) {
      console.error('Failed to apply policy template:', error);
      throw new Error('정책 템플릿 적용에 실패했습니다.');
    }
  },

  async savePolicyTemplate(template: {
    name: string;
    description: string;
    category: string;
    settings: Record<string, unknown>;
  }): Promise<void> {
    try {
      await api.post('/admin/policy-settings/templates', template);
    } catch (error) {
      console.error('Failed to save policy template:', error);
      throw new Error('정책 템플릿 저장에 실패했습니다.');
    }
  },

  // Policy compliance
  async checkCompliance(): Promise<{
    overall: number;
    categories: Record<string, {
      score: number;
      issues: string[];
      recommendations: string[];
    }>;
  }> {
    try {
      const response = await api.get('/admin/policy-settings/compliance');
      return response.data;
    } catch (error) {
      console.error('Failed to check policy compliance:', error);
      throw new Error('정책 준수 검사에 실패했습니다.');
    }
  },

  // Policy backup and restore
  async createBackup(name: string): Promise<{
    id: string;
    name: string;
    timestamp: string;
  }> {
    try {
      const response = await api.post('/admin/policy-settings/backup', { name });
      return response.data;
    } catch (error) {
      console.error('Failed to create policy backup:', error);
      throw new Error('정책 백업 생성에 실패했습니다.');
    }
  },

  async getBackups(): Promise<Array<{
    id: string;
    name: string;
    timestamp: string;
    size: number;
  }>> {
    try {
      const response = await api.get('/admin/policy-settings/backups');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch policy backups:', error);
      return [];
    }
  },

  async restoreBackup(backupId: string): Promise<PolicySettings> {
    try {
      const response = await api.post(`/admin/policy-settings/backup/${backupId}/restore`);
      return response.data;
    } catch (error) {
      console.error('Failed to restore policy backup:', error);
      throw new Error('정책 백업 복원에 실패했습니다.');
    }
  },

  // Mock data generators for development
  getMockSettings(): PolicySettings {
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

  getMockHistory(): PolicyHistory[] {
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