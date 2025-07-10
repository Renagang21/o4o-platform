import React from 'react';
interface SalesTargetSettings {
    monthlyTarget: number;
    alertThreshold: number;
    bonusThreshold: number;
}
interface SalesTargetPoliciesProps {
    settings: SalesTargetSettings;
    onUpdate: (updates: Partial<SalesTargetSettings>) => void;
}
declare const SalesTargetPolicies: React.FC<SalesTargetPoliciesProps>;
export default SalesTargetPolicies;
//# sourceMappingURL=SalesTargetPolicies.d.ts.map