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
    changes: Record<string, any>;
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
export declare const policySettingsApi: {
    getAllSettings(): Promise<PolicySettings>;
    updatePartnerPolicies(settings: Partial<PartnerPolicySettings>): Promise<PartnerPolicySettings>;
    updateSalesPolicies(settings: Partial<SalesPolicySettings>): Promise<SalesPolicySettings>;
    updateInventoryPolicies(settings: Partial<InventoryPolicySettings>): Promise<InventoryPolicySettings>;
    updateUserSecurityPolicies(settings: Partial<UserSecurityPolicySettings>): Promise<UserSecurityPolicySettings>;
    updateAllSettings(settings: Partial<PolicySettings>): Promise<PolicySettings>;
    validateSettings(settings: Partial<PolicySettings>): Promise<PolicyValidationResult>;
    getPolicyHistory(category?: string, limit?: number): Promise<PolicyHistory[]>;
    exportSettings(): Promise<Blob>;
    importSettings(file: File): Promise<PolicySettings>;
    resetToDefaults(category?: string): Promise<PolicySettings>;
    getPolicyStats(): Promise<{
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
    }>;
    testPolicyConfiguration(category: string, settings: any): Promise<{
        success: boolean;
        results: Array<{
            test: string;
            passed: boolean;
            message: string;
        }>;
    }>;
    getPolicyNotifications(): Promise<Array<{
        id: string;
        type: "info" | "warning" | "error" | "success";
        category: string;
        title: string;
        message: string;
        timestamp: string;
        read: boolean;
    }>>;
    markNotificationAsRead(notificationId: string): Promise<void>;
    getPolicyTemplates(): Promise<Array<{
        id: string;
        name: string;
        description: string;
        category: string;
        settings: any;
        isDefault: boolean;
    }>>;
    applyPolicyTemplate(templateId: string): Promise<PolicySettings>;
    savePolicyTemplate(template: {
        name: string;
        description: string;
        category: string;
        settings: any;
    }): Promise<void>;
    checkCompliance(): Promise<{
        overall: number;
        categories: Record<string, {
            score: number;
            issues: string[];
            recommendations: string[];
        }>;
    }>;
    createBackup(name: string): Promise<{
        id: string;
        name: string;
        timestamp: string;
    }>;
    getBackups(): Promise<Array<{
        id: string;
        name: string;
        timestamp: string;
        size: number;
    }>>;
    restoreBackup(backupId: string): Promise<PolicySettings>;
    getMockSettings(): PolicySettings;
    getMockHistory(): PolicyHistory[];
};
//# sourceMappingURL=policy-settings.d.ts.map