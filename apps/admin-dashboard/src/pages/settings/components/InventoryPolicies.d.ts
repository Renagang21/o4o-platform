import React from 'react';
interface InventorySettings {
    lowStockThreshold: number;
    criticalStockThreshold: number;
    autoReorder: boolean;
}
interface InventoryPoliciesProps {
    settings: InventorySettings;
    onUpdate: (updates: Partial<InventorySettings>) => void;
}
declare const InventoryPolicies: React.FC<InventoryPoliciesProps>;
export default InventoryPolicies;
//# sourceMappingURL=InventoryPolicies.d.ts.map