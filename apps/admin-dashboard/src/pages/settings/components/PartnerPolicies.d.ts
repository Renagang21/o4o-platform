import React from 'react';
interface PartnerTier {
    name: string;
    minSales: number;
    commissionRate: number;
}
interface PartnerPoliciesSettings {
    autoApproval: boolean;
    commissionRate: number;
    tierLevels: PartnerTier[];
}
interface PartnerPoliciesProps {
    settings: PartnerPoliciesSettings;
    onUpdate: (updates: Partial<PartnerPoliciesSettings>) => void;
}
declare const PartnerPolicies: React.FC<PartnerPoliciesProps>;
export default PartnerPolicies;
//# sourceMappingURL=PartnerPolicies.d.ts.map