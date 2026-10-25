import { BUSINESS_SITE } from '../config/businessSite';
import type { SocialProof, KakaoSignupRequest } from '@o4o/auth-client';
/**
 * Auth Context
 *
 * Uses @o4o/auth-client with localStorage strategy for cross-domain auth.
 * Server auto-detects cross-origin and includes tokens in response.
 *
 * WO-O4O-AUTH-SERVICE-TOKEN-BOUNDARY-HARDENING-V1: Phase 2-b Service User 로그인 블록
 * (/api/v1/auth/service/login · kpa_pharmacy_service_* 토큰) RETIRED — 소비처 0 · 서버 경로 은퇴.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { AuthClient, getAccessToken, type GoogleAuthConfig } from '@o4o/auth-client';
import { normalizeMemberships, type ApiUser } from '@o4o/auth-utils';
// WO-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-V1:
//   세션 복구 · 토큰 정리 이벤트 · login/logout 은 공통 Core 로 이동.
import { useServiceAuth, type AuthLoginResult, type GoogleSignupConsents, type PendingPolicyAcceptance, type PolicyAcceptanceResult } from '@o4o/auth-react';

// Re-export for client.ts to use
export { getAccessToken };

// ============================================================================
// Auth Client Instance
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

// Create auth client with localStorage strategy for cross-domain authentication
// Exported so KPA API modules share this single instance (localStorage strategy)
// instead of the @o4o/auth-client singleton which defaults to cookie strategy.
export const authClient = new AuthClient(`${API_BASE_URL}/api/v1`, {
  strategy: 'localStorage',
});

// ============================================================================
// Types
// ============================================================================

/**
 * WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1 D8:
 *   pharmacy 는 KPA 분회 테이블(kpa_members · kpa_pharmacist_profiles · kpa_organizations)을
 *   읽지 않는다. `/kpa/me-context` 보강(activityType · isStoreOwner · kpaMembership)은 제거했다.
 *   매장 접근 판정은 store.neture.co.kr handoff 목적지가 한다.
 */
export interface User {
  id: string;
  email: string;
  name: string;
  /** WO-FORUM-NICKNAME-UNIFICATION-V1: 포럼 공개 표시명 */
  nickname?: string;
  role?: string;  // WO-O4O-ROLE-MODEL-UNIFICATION-PHASE2-V1: deprecated, use roles[]
  roles: string[];  // Primary role array
  memberships?: { serviceKey: string; status: string }[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /**
   * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
   *   login(email, password) 는 은퇴했다. 로그인 진입은 Google 하나다.
   *   반환 계약(result object)은 그대로 — 서버 `code`(SERVICE_NOT_MEMBER 등)를 호출부가 분기한다.
   */
  loginWithGoogle: (idToken: string) => Promise<AuthLoginResult<User>>;
  /** WO-O4O-CROSS-SERVICE-LOGIN-ENTRY-AND-RETURN-FLOW-FIX-V1: 플랫폼 이메일 계정 로그인(세션 서비스는 서버가 Origin 으로 정한다). */
  loginWithEmail: (email: string, password: string) => Promise<AuthLoginResult<User>>;
  loginWithKakao: (proof: SocialProof) => Promise<AuthLoginResult<User>>;
  signupWithKakao: (token: string, input: KakaoSignupRequest) => Promise<AuthLoginResult<User>>;
  signupWithGoogle: (idToken: string, consents: GoogleSignupConsents) => Promise<AuthLoginResult<User>>;
  getGoogleAuthConfig: () => Promise<GoogleAuthConfig>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  /** WO-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1 §16·§17: 미승낙 약관 · 승낙 제출 */
  pendingPolicyAcceptances: PendingPolicyAcceptance[];
  acceptPendingPolicies: () => Promise<PolicyAcceptanceResult>;
}

// WO-O4O-AUTH-CHAIN-UNIFICATION-V1: ApiUser is imported from @o4o/auth-utils

/** API 응답 → User. roles 배열은 그대로 보존한다(Phase 4 prefixed roles). */
function createUserFromApiResponse(apiUser: ApiUser): User {
  const role = apiUser.role || 'pharmacist';
  return {
    id: apiUser.id,
    email: apiUser.email,
    name: apiUser.fullName || apiUser.name || apiUser.email,
    // WO-O4O-KPA-FORUM-DISPLAYNAME-NICKNAME-ALIGNMENT-V1: 포럼 공개 표시명 canonical: nickname → name → email local-part.
    nickname: (apiUser as any).nickname || undefined,
    role,
    roles: apiUser.roles || [role],
    memberships: normalizeMemberships(apiUser),
  };
}

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * WO-O4O-GOOGLE-IDENTITY-PRODUCTION-ACTIVATION-AND-SMOKE-V1: 모듈 수준 상수 — render 마다 새 참조를 만들지 않는다.
 * (<GoogleContinue /> 는 자체 ref 로도 방어하지만, provider 가 안정된 참조를 넘기는 것이 2차 방어다.)
 */
const getGoogleAuthConfig = () => authClient.getGoogleAuthConfig();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  /**
   * WO-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-V1:
   *   인증 상태·세션 복구·로그인/로그아웃은 공통 Core 가 담당한다.
   *   차이는 serviceKey / 자체 authClient(localStorage 전략) 주입뿐이다.
   */
  const core = useServiceAuth<User>(
    useMemo(
      () => ({
        // canonical service key — role prefix 가 아니라 service_memberships.service_key.
        serviceKey: BUSINESS_SITE.authServiceKey,
        authClient,
        getAccessToken,
        toUser: (apiUser: Record<string, unknown>) => createUserFromApiResponse(apiUser as unknown as ApiUser),
      }),
      [],
    ),
  );

  return (
    <AuthContext.Provider
      value={{
        user: core.user,
        isAuthenticated: core.isAuthenticated,
        isLoading: core.isLoading,
        loginWithGoogle: core.loginWithGoogle,
        loginWithEmail: core.loginWithEmail,
        signupWithGoogle: core.signupWithGoogle,
        loginWithKakao: core.loginWithKakao, signupWithKakao: core.signupWithKakao,
        getGoogleAuthConfig,
        logout: core.logout,
        checkAuth: core.refresh,
        pendingPolicyAcceptances: core.pendingPolicyAcceptances,
        acceptPendingPolicies: core.acceptPendingPolicies,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
