import React from 'react';
interface UserSecuritySettings {
    requireApproval: boolean;
    sessionTimeout: number;
    passwordPolicy: {
        minLength: number;
        requireSpecialChars: boolean;
    };
}
interface UserSecurityPoliciesProps {
    settings: UserSecuritySettings;
    onUpdate: (updates: Partial<UserSecuritySettings>) => void;
}
declare const UserSecurityPolicies: React.FC<UserSecurityPoliciesProps>;
export default UserSecurityPolicies;
//# sourceMappingURL=UserSecurityPolicies.d.ts.map