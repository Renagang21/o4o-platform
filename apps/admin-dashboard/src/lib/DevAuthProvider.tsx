import { FC, ReactNode } from 'react';
import { AuthProvider } from '@o4o/auth-context';
import axios from 'axios';

// 개발 환경용 인증 프로바이더
// 개발 환경용 모의 사용자 데이터
const mockUser = {
  id: 'admin_1',
  email: 'admin@o4o.com',
  name: '관리자',
  role: 'admin' as const,
  status: 'approved' as const,
  isApproved: true,
  permissions: ['admin.access', 'users.manage', 'content.manage', 'settings.manage'],
  lastLoginAt: new Date().toISOString(),
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: new Date().toISOString()
};

const mockToken = 'mock-jwt-token-dev-' + Date.now();

export const DevAuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // 컴포넌트 마운트 전에 로컬 스토리지 설정
  // VITE_USE_MOCK이 명시적으로 true일 때만 mock 데이터 사용
  // 임시: 프로덕션에서도 VITE_USE_MOCK 체크
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    // 로컬 스토리지에 인증 정보 저장
    const authData = {
      state: {
        user: mockUser,
        token: mockToken,
        isAuthenticated: true
      },
      version: 0
    };
    
    localStorage.setItem('admin-auth-storage', JSON.stringify(authData));
    localStorage.setItem('authToken', mockToken);
    localStorage.setItem('user', JSON.stringify(mockUser));

    // axios 기본 헤더 설정
    axios.defaults.headers.common['Authorization'] = `Bearer ${mockToken}`;
    
    // 콘솔에 로그
    // console.log('DevAuthProvider: Mock 인증 사용 (VITE_USE_MOCK=true)', mockUser);
  } else {
    // Mock 사용하지 않을 경우 인증 정보 제거
    localStorage.removeItem('admin-auth-storage');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  }

  // 일반 AuthProvider 사용
  return <AuthProvider>{children}</AuthProvider>;
};