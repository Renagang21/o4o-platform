/**
 * AuthContext - GlucoseView 인증 및 역할 관리
 * httpOnly Cookie 기반 인증
 *
 * WO-O4O-AUTH-CHAIN-UNIFICATION-V1: @o4o/auth-utils 기반 통일
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { parseAuthResponse, mapApiRoles, normalizeUser, resolveAuthError } from '@o4o/auth-utils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

// 사용자 역할
export type UserRole = 'pharmacist' | 'admin' | 'operator' | 'patient';

// 승인 상태
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

// 사용자 타입
export interface User {
  id: string;
  name: string;
  email: string;
  roles: UserRole[];
  role?: UserRole;  // WO-O4O-ROLE-MODEL-UNIFICATION-PHASE2-V1: deprecated, use roles[]
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
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; passwordSyncAvailable?: boolean; syncToken?: string }>;
  passwordSync: (email: string, syncToken: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// WO-O4O-AUTH-CHAIN-UNIFICATION-V1: 서비스별 역할 매핑 테이블
const ROLE_MAP: Record<string, UserRole> = {
  admin: 'admin',
  super_admin: 'admin',
  operator: 'operator',
  pharmacist: 'pharmacist',
  seller: 'pharmacist',
  customer: 'pharmacist',
  user: 'pharmacist',
  patient: 'patient',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // httpOnly Cookie 기반 세션 확인
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          const { user: apiUser } = parseAuthResponse(data);
          if (apiUser) {
            const roles = mapApiRoles(apiUser, ROLE_MAP, 'pharmacist' as UserRole);
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
        }
      } catch {
        // 세션 없음 - 정상
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string; passwordSyncAvailable?: boolean; syncToken?: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'PASSWORD_MISMATCH' && data.passwordSyncAvailable) {
          return { success: false, message: data.error, passwordSyncAvailable: true, syncToken: data.syncToken };
        }
        return { success: false, message: resolveAuthError(data, response.status) };
      }

      const { user: apiUser } = parseAuthResponse(data);
      if (apiUser) {
        const roles = mapApiRoles(apiUser, ROLE_MAP, 'pharmacist' as UserRole);
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
          return { success: true, message: 'pending' };
        }
        if (approvalStatus === 'rejected') {
          return { success: true, message: 'rejected' };
        }

        return { success: true };
      }

      return { success: false, message: '로그인 응답이 올바르지 않습니다.' };
    } catch {
      return { success: false, message: '로그인에 실패했습니다.' };
    }
  };

  const passwordSync = async (email: string, syncToken: string, newPassword: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/password-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, syncToken, newPassword }),
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        return { success: false, message: data.error || '비밀번호 변경에 실패했습니다.' };
      }
      const { user: apiUser } = parseAuthResponse(data);
      if (apiUser) {
        const roles = mapApiRoles(apiUser, ROLE_MAP, 'pharmacist' as UserRole);
        const base = normalizeUser(apiUser);
        const userData: User = {
          ...base,
          roles,
          memberships: (apiUser as any).memberships || [],
          approvalStatus: apiUser.status === 'active' ? 'approved' : 'pending',
          displayName: base.name,
        };
        setUser(userData);
        return { success: true };
      }
      return { success: false, message: '응답이 올바르지 않습니다.' };
    } catch {
      return { success: false, message: '비밀번호 변경에 실패했습니다.' };
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // 로그아웃 실패해도 로컬 상태 정리
    }
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  const isApproved = user?.approvalStatus === 'approved';
  const isAdmin = !!(user?.roles.includes('admin') && isApproved);
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
      passwordSync,
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
