import { FC, ReactNode } from 'react';
import { AuthClient } from '@o4o/auth-client';
interface AuthProviderProps {
    children: ReactNode;
    ssoClient?: AuthClient;
    autoRefresh?: boolean;
    onAuthError?: (error: string) => void;
    onSessionExpiring?: (remainingSeconds: number) => void;
}
export declare const AuthProvider: FC<AuthProviderProps>;
export {};
//# sourceMappingURL=AuthProvider.d.ts.map