/**
 * AuthContext - GlucoseView 인증 및 역할 관리
 * WO-O4O-AUTH-AUTO-REFRESH-IMPLEMENTATION-V1: authClient 기반 auto-refresh
 * WO-O4O-AUTH-RBAC-UNIFICATION-V2: prefix 유지, mapApiRoles 제거
 *
 * - authClient.api (Axios) 경유 → 401 자동 갱신
 * - localStorage 전략 (o4o_accessToken / o4o_refreshToken)
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { parseAuthResponse, normalizeUser, resolveAuthError, extractRoles } from '@o4o/auth-utils';
import { getAccessToken, clearAllTokens } from '@o4o/auth-client';
import { authClient, api } from '../lib/apiClient';

// Re-export for backward compatibility (operatorDashboard.ts, UsersPage 등에서 import)
export { getAccessToken } from '@o4o/auth-client';

/**
 * WO-O4O-AUTH-RBAC-UNIFICATION-V2: prefixed role format
 * e.g., 'glucoseview:admin', 'glucoseview:operator', 'platform:super_admin'
 */
export type UserRole = string;

// 승인 상태
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

// 사용자 타입
export interface User {
  id: string;
  name: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: UserRole[];
  memberships?: { serviceKey: string; status: string }[];
  approvalStatus: ApprovalStatus;
  pharmacyName?: string;
  pharmacyAddress?: string;
  phone?: string;
  licenseNumber?: string;
  displayName?: string;
  chapterId?: string;
  chapterName?: string;
  branchName?: string;
  rejectionReason?: string;
}

// 인증 컨텍스트 타입
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isApproved: boolean;
  isAdmin: boolean;
  isPending: boolean;
  isRejected: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; roles?: UserRole[] }>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // authClient.api 기반 세션 확인 — 401 시 자동 refresh
  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = getAccessToken();
        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await api.get('/auth/me');
        const data = response.data;
        const { user: apiUser } = parseAuthResponse(data);
        if (apiUser) {
          const roles = extractRoles(apiUser, ['glucoseview:patient']);

          // WO-O4O-GLUCOSEVIEW-AUTH-ROLE-GUARD-V1: 당뇨인 전용 서비스
          // customer/user = GlycoPharm/GlucoseView 가입 시 legacy role
          const PATIENT_ROLES = ['glucoseview:patient', 'customer', 'user'];
          if (!roles.some(r => PATIENT_ROLES.includes(r))) {
            clearAllTokens();
            setIsLoading(false);
            return;
          }

          const base = normalizeUser(apiUser);
          const userData: User = {
            ...base,
            roles,
            memberships: (apiUser as any).memberships || [],
            approvalStatus: apiUser.status === 'active' ? 'approved' : 'pending',
            displayName: base.name,
          };
          setUser(userData);
        }
      } catch {
        // 세션 없음 또는 refresh 실패 — 정상
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string; roles?: UserRole[] }> => {
    try {
      // WO-O4O-AUTH-TOKEN-STORAGE-HOTFIX-V1: use authClient.login()
      // which stores tokens to localStorage (api.post() alone does not)
      const result = await authClient.login({ email, password });
      const apiUser = result.user as any;
      if (apiUser) {
        const roles = extractRoles(apiUser, ['glucoseview:patient']);

        // WO-O4O-GLUCOSEVIEW-AUTH-ROLE-GUARD-V1: 당뇨인 전용 서비스
        // customer/user = GlycoPharm/GlucoseView 가입 시 legacy role
        const PATIENT_ROLES = ['glucoseview:patient', 'customer', 'user'];
        if (!roles.some(r => PATIENT_ROLES.includes(r))) {
          clearAllTokens();
          return { success: false, message: 'GlucoseView는 당뇨인 전용 서비스입니다. 약사는 GlycoPharm을 이용해주세요.' };
        }

        const base = normalizeUser(apiUser);

        // API 상태를 ApprovalStatus로 매핑
        let approvalStatus: ApprovalStatus = 'pending';
        if (apiUser.status === 'active') {
          approvalStatus = 'approved';
        } else if (apiUser.status === 'rejected' || apiUser.status === 'inactive') {
          approvalStatus = 'rejected';
        }

        const userData: User = {
          ...base,
          roles,
          memberships: (apiUser as any).memberships || [],
          approvalStatus,
          displayName: base.name,
        };
        setUser(userData);

        // 승인 상태에 따른 메시지
        if (approvalStatus === 'pending') {
          return { success: true, message: 'pending', roles };
        }
        if (approvalStatus === 'rejected') {
          return { success: true, message: 'rejected', roles };
        }

        return { success: true, roles };
      }

      return { success: false, message: '로그인 응답이 올바르지 않습니다.' };
    } catch (error: any) {
      // Axios는 non-2xx 시 throw — error.response.data로 서버 에러 접근
      const data = error.response?.data;
      if (data) {
        return { success: false, message: resolveAuthError(data, error.response?.status) };
      }
      return { success: false, message: '로그인에 실패했습니다.' };
    }
  };

  const logout = async () => {
    // WO-O4O-AUTH-CLIENT-API-HARDENING-V1: authClient.logout() handles API call + token cleanup
    await authClient.logout();
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  const isApproved = user?.approvalStatus === 'approved';
  const isAdmin = !!(user?.roles.some(r => r === 'glucoseview:admin' || r === 'platform:super_admin') && isApproved);
  const isPending = user?.approvalStatus === 'pending';
  const isRejected = user?.approvalStatus === 'rejected';

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      isApproved,
      isAdmin,
      isPending,
      isRejected,
      login,
      logout,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
