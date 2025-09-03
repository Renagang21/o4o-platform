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

export declare function useAuth(): AuthContextType;

export default {
  AuthContext: AuthContext,
  AuthProvider: AuthProvider,
  useAuth: useAuth,
  CookieAuthProvider: CookieAuthProvider,
  SSOAuthProvider: SSOAuthProvider
};
