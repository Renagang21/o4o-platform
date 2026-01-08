/**
 * AuthContext - GlucoseView 인증 및 역할 관리
 * httpOnly Cookie 기반 인증
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

// 사용자 역할
export type UserRole = 'pharmacist' | 'admin';

// 승인 상태
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

// 사용자 타입
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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
  isApproved: boolean;
  isAdmin: boolean;
  isPending: boolean;
  isRejected: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// API 역할을 web 역할로 매핑
function mapApiRole(apiRole: string): UserRole {
  const roleMap: Record<string, UserRole> = {
    'admin': 'admin',
    'super_admin': 'admin',
    'pharmacist': 'pharmacist',
    'seller': 'pharmacist',
    'customer': 'pharmacist',
    'user': 'pharmacist',
  };
  return roleMap[apiRole] || 'pharmacist';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // httpOnly Cookie 기반 세션 확인
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            const apiUser = data.user;
            const mappedRole = mapApiRole(apiUser.role);
            const userData: User = {
              id: apiUser.id,
              name: apiUser.fullName || apiUser.email,
              email: apiUser.email,
              role: mappedRole,
              approvalStatus: apiUser.status === 'active' ? 'approved' : 'pending',
              displayName: apiUser.fullName || apiUser.email,
              phone: apiUser.phone,
            };
            setUser(userData);
          }
        }
      } catch {
        // 세션 없음 - 정상
      }
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, message: data.message || data.error || '이메일 또는 비밀번호가 올바르지 않습니다.' };
      }

      if (data.user) {
        const apiUser = data.user;
        const mappedRole = mapApiRole(apiUser.role);
        const approvalStatus: ApprovalStatus = apiUser.status === 'active' ? 'approved' : 'pending';

        const userData: User = {
          id: apiUser.id,
          name: apiUser.fullName || apiUser.email,
          email: apiUser.email,
          role: mappedRole,
          approvalStatus,
          displayName: apiUser.fullName || apiUser.email,
          phone: apiUser.phone,
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
  const isAdmin = user?.role === 'admin' && isApproved;
  const isPending = user?.approvalStatus === 'pending';
  const isRejected = user?.approvalStatus === 'rejected';

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
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
