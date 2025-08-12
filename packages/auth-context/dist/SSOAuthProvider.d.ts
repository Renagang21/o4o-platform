import { FC } from 'react';
import { CookieAuthProviderProps } from './CookieAuthProvider';
export interface SSOAuthProviderProps extends CookieAuthProviderProps {
    enableSSO?: boolean;
    ssoCheckInterval?: number;
}
export declare const SSOAuthProvider: FC<SSOAuthProviderProps>;
export declare const useSSO: () => {
    hasSession: boolean;
};
//# sourceMappingURL=SSOAuthProvider.d.ts.map