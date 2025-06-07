import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { authAPI } from '../services/api';
import { toast } from 'react-toastify';

export interface User {
  _id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'manager';
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  businessInfo?: {
    businessName: string;
    businessType: string;
    businessNumber?: string;
    address: string;
    phone: string;
  };
  createdAt: string;
  lastLoginAt?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && user.status === 'approved';

  // 로그인
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await authAPI.login(email, password);
      const { token, user: userData } = response.data;

      // 쿠키에 토큰 저장 (24시간)
      Cookies.set('authToken', token, { expires: 1 });
      Cookies.set('user', JSON.stringify(userData), { expires: 1 });

      setUser(userData);
      toast.success('로그인되었습니다.');
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || '로그인에 실패했습니다.';
      const errorCode = error.response?.data?.code;

      switch (errorCode) {
        case 'INVALID_CREDENTIALS':
          toast.error('이메일 또는 비밀번호가 올바르지 않습니다.');
          break;
        case 'ACCOUNT_PENDING':
          toast.warning('계정 승인 대기 중입니다. 관리자 승인 후 이용하실 수 있습니다.');
          break;
        case 'ACCOUNT_REJECTED':
          toast.error('계정이 거부되었습니다. 관리자에게 문의하세요.');
          break;
        case 'ACCOUNT_SUSPENDED':
          toast.error('계정이 정지되었습니다. 관리자에게 문의하세요.');
          break;
        default:
          toast.error(errorMessage);
      }
      return false;
    }
  };

  // 로그아웃
  const logout = () => {
    Cookies.remove('authToken');
    Cookies.remove('user');
    setUser(null);
    toast.info('로그아웃되었습니다.');
  };

  // 사용자 정보 업데이트
  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      Cookies.set('user', JSON.stringify(updatedUser), { expires: 1 });
    }
  };

  // 인증 상태 확인
  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      
      // 쿠키에서 토큰과 사용자 정보 확인
      const token = Cookies.get('authToken');
      const storedUser = Cookies.get('user');

      if (!token || !storedUser) {
        setUser(null);
        return;
      }

      // 저장된 사용자 정보 복원
      const userData = JSON.parse(storedUser);
      
      // 토큰 유효성 검증
      const response = await authAPI.verifyToken();
      if (response.data.valid) {
        setUser(response.data.user);
      } else {
        // 토큰이 유효하지 않으면 로그아웃
        logout();
      }
    } catch (error) {
      // 토큰 검증 실패 시 로그아웃
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 인증 상태 확인
  useEffect(() => {
    checkAuthStatus();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
        updateUser,
        checkAuthStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// 커스텀 훅
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// 권한 확인 훅
export const usePermissions = () => {
  const { user } = useAuth();

  return {
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager',
    isManagerOrAdmin: user?.role === 'admin' || user?.role === 'manager',
    hasRole: (roles: string[]) => user ? roles.includes(user.role) : false,
    canAccessAdmin: user?.role === 'admin' || user?.role === 'manager',
  };
};
