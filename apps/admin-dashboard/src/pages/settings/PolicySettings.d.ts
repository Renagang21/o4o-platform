import React from 'react';
interface PolicySettings {
    partners: {
        autoApproval: boolean;
        commissionRate: number;
        tierLevels: Array<{
            name: string;
            minSales: number;
            commissionRate: number;
        }>;
    };
    sales: {
        monthlyTarget: number;
        alertThreshold: number;
        bonusThreshold: number;
    };
    inventory: {
        lowStockThreshold: number;
        criticalStockThreshold: number;
        autoReorder: boolean;
    };
    users: {
        requireApproval: boolean;
        sessionTimeout: number;
        passwordPolicy: {
            minLength: number;
            requireSpecialChars: boolean;
        };
    };
}
declare const PolicySettings: React.FC;
export default PolicySettings;
//# sourceMappingURL=PolicySettings.d.ts.map