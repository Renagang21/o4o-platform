import React, { useEffect } from 'react';
import { AuthProvider } from '@o4o/auth-context';
import { AuthClient } from '@o4o/auth-client';

// 개발 환경용 인증 프로바이더
export const DevAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 개발 환경에서 자동 로그인
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // 로컬 스토리지에 모의 토큰 설정
      const mockToken = 'mock-jwt-token-dev';
      const mockUser = {
        id: 'admin_1',
        email: 'admin@o4o.com',
        name: '관리자',
        role: 'admin',
        status: 'approved',
        permissions: ['admin.access', 'users.manage', 'content.manage', 'settings.manage'],
        lastLoginAt: new Date().toISOString(),
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: new Date().toISOString()
      };

      // 로컬 스토리지에 인증 정보 저장
      localStorage.setItem('admin-auth-storage', JSON.stringify({
        state: {
          user: mockUser,
          token: mockToken,
          isAuthenticated: true
        },
        version: 0
      }));

      // AuthClient 헤더 설정
      AuthClient.defaults.headers.common['Authorization'] = `Bearer ${mockToken}`;
    }
  }, []);

  return <AuthProvider>{children}</AuthProvider>;
};