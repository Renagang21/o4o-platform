import { ComponentType, FC, ReactNode } from 'react';
import { LoginCredentials, RegisterData, User } from '@o4o/auth-client';
interface CookieAuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => Promise<void>;
    logoutAll: () => Promise<void>;
    checkAuth: () => Promise<void>;
    isAuthenticated: boolean;
    hasRole: (role: string | string[]) => boolean;
    hasPermission: (permission: string) => boolean;
}
export interface CookieAuthProviderProps {
    children: ReactNode;
    onAuthChange?: (user: User | null) => void;
    enableSessionSync?: boolean;
    sessionCheckInterval?: number;
}
export declare const CookieAuthProvider: FC<CookieAuthProviderProps>;
export declare const useCookieAuth: () => CookieAuthContextType;
export declare const withRole: <P extends object>(Component: ComponentType<P>, allowedRoles: string | string[]) => (props: P) => import("react/jsx-runtime").JSX.Element;
export declare const useRoleAccess: (allowedRoles: string | string[]) => boolean;
export {};
//# sourceMappingURL=CookieAuthProvider.d.ts.map