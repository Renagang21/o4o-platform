import React from 'react';
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

export const DevAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 컴포넌트 마운트 전에 로컬 스토리지 설정
  if (import.meta.env.DEV) {
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
    console.log('DevAuthProvider: 개발 환경 자동 로그인 설정 완료', mockUser);
  }

  // 일반 AuthProvider 사용
  return <AuthProvider>{children}</AuthProvider>;
};