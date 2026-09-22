/**
 * hospital-pharmacy-web AuthContext — **새 인증 시스템을 만들지 않는다.**
 * O4O 공통 Identity 를 그대로 소비한다(@o4o/auth-react `useServiceAuth` + Google 전용 진입).
 * web-store · web-lecture 와 같은 계약이며 이 서비스가 더하는 것은 0이다.
 *
 * serviceKey 를 넘기지 않는 이유: `hospital-pharmacy` 는 아직 `ServiceKey` union · `service_memberships`
 * 등록 전이다(가짜 serviceKey 를 만들지 않는다). Google 로그인은 serviceKey 로 차단하지 않으므로
 * (`google-auth.service` 는 라벨만 붙인다) 생략이 현행 계약상 허용된다 — web-store 선례.
 * 등록이 끝나면 여기 한 줄(`serviceKey: SERVICE_KEY`)만 더하면 된다.
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
import { authClient } from '../lib/apiClient';

export interface HospitalUser extends UserLike {
  id?: string;
  email?: string;
  name?: string;
  roles?: string[];
  memberships?: { serviceKey: string; status: string }[];
}

interface AuthContextValue {
  user: HospitalUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
  loginWithGoogle: (idToken: string) => Promise<AuthLoginResult<HospitalUser>>;
  signupWithGoogle: (idToken: string, consents: GoogleSignupConsents) => Promise<AuthLoginResult<HospitalUser>>;
  pendingPolicyAcceptances: PendingPolicyAcceptance[];
  acceptPendingPolicies: () => Promise<PolicyAcceptanceResult>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toUser(apiUser: Record<string, unknown>): HospitalUser {
  return {
    ...apiUser,
    ...normalizeUser(apiUser as never),
    roles: extractRoles(apiUser as never, []),
    memberships: normalizeMemberships(apiUser as never),
  } as HospitalUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const core = useServiceAuth<HospitalUser>(useMemo(() => ({ authClient, getAccessToken, toUser }), []));
  return (
    <AuthContext.Provider
      value={{
        user: core.user,
        isAuthenticated: core.isAuthenticated,
        isLoading: core.isLoading,
        logout: () => {
          void core.logout();
        },
        loginWithGoogle: core.loginWithGoogle,
        signupWithGoogle: core.signupWithGoogle,
        pendingPolicyAcceptances: core.pendingPolicyAcceptances,
        acceptPendingPolicies: core.acceptPendingPolicies,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
