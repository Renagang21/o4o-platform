/**
 * store-web AuthContext — 새 인증 방식을 만들지 않는다(@o4o/auth-react `useServiceAuth` 재사용).
 * 차이는 단 하나: **serviceKey 를 넘기지 않는다.** Store Workspace 는 서비스가 아니므로
 * `/auth/google/login` 을 serviceKey 없이 부른다(서버 계약상 선택 항목).
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { normalizeUser, normalizeMemberships, extractRoles, type UserLike } from '@o4o/auth-utils';
import { getAccessToken } from '@o4o/auth-client';
import {
  useServiceAuth,
  type AuthLoginResult,
  type GoogleSignupConsents,
  type PendingPolicyAcceptance,
  type PolicyAcceptanceResult,
} from '@o4o/auth-react';
import { configureStoreProductsApi } from '@o4o/store-products-ui';
import { authClient } from '../lib/apiClient';

// KPA canonical 트리에서 이식된 api 모듈 · @o4o/store-products-ui 가 이 두 export 를 쓴다(KPA AuthContext 와 같은 계약).
export { getAccessToken, authClient };
configureStoreProductsApi(authClient.api);

export interface StoreUser extends UserLike {
  id?: string;
  email?: string;
  name?: string;
  roles?: string[];
  memberships?: { serviceKey: string; status: string }[];
}
interface AuthContextValue {
  user: StoreUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
  loginWithGoogle: (idToken: string) => Promise<AuthLoginResult<StoreUser>>;
  signupWithGoogle: (idToken: string, consents: GoogleSignupConsents) => Promise<AuthLoginResult<StoreUser>>;
  pendingPolicyAcceptances: PendingPolicyAcceptance[];
  acceptPendingPolicies: () => Promise<PolicyAcceptanceResult>;
}
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toUser(apiUser: Record<string, unknown>): StoreUser {
  return {
    ...apiUser,
    ...normalizeUser(apiUser as never),
    roles: extractRoles(apiUser as never, []),
    memberships: normalizeMemberships(apiUser as never),
  } as StoreUser;
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const core = useServiceAuth<StoreUser>(useMemo(() => ({
    // serviceKey 생략 — Store Workspace ≠ 서비스 (가짜 serviceKey 등록 금지)
    authClient, getAccessToken, toUser,
  }), []));
  return <AuthContext.Provider value={{
    user: core.user,
    isAuthenticated: core.isAuthenticated,
    isLoading: core.isLoading,
    logout: () => { void core.logout(); },
    loginWithGoogle: core.loginWithGoogle,
    signupWithGoogle: core.signupWithGoogle,
    pendingPolicyAcceptances: core.pendingPolicyAcceptances,
    acceptPendingPolicies: core.acceptPendingPolicies,
  }}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
