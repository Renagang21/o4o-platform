import { ReactNode } from 'react';

export interface AuthContextType {
  user?: any;
  login?: (credentials: any) => Promise<void>;
  logout?: () => Promise<void>;
  isAuthenticated?: boolean;
}

export declare const AuthContext: React.Context<AuthContextType | null>;

export declare const AuthProvider: React.FC<{ children: ReactNode }>;
export declare const CookieAuthProvider: React.FC<{ children: ReactNode }>;
export declare const SSOAuthProvider: React.FC<{ children: ReactNode }>;
export declare const AdminProtectedRoute: React.FC<{ children: ReactNode }>;

export declare function useAuth(): AuthContextType;
export declare function useCookieAuth(): AuthContextType & { logoutAll: () => Promise<void> };

export declare class SessionManager {
  static getInstance(): {
    checkSession: () => Promise<boolean>;
    refreshSession: () => Promise<boolean>;
    clearSession: () => Promise<boolean>;
  };
}

declare const _default: {
  AuthContext: typeof AuthContext;
  AuthProvider: typeof AuthProvider;
  useAuth: typeof useAuth;
  useCookieAuth: typeof useCookieAuth;
  CookieAuthProvider: typeof CookieAuthProvider;
  SSOAuthProvider: typeof SSOAuthProvider;
  SessionManager: typeof SessionManager;
  AdminProtectedRoute: typeof AdminProtectedRoute;
};
export default _default;
