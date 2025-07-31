import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

// 개발 모드에서 자동 로그인을 위한 컴포넌트
export const DevAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setUser } = useAuthStore();

  useEffect(() => {
    // 개발 모드이고 VITE_USE_MOCK이 true일 때만 작동
    // 임시: 프로덕션에서도 VITE_USE_MOCK 체크
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      const mockUser = {
        id: 'admin_1',
        email: 'admin@neture.co.kr',
        name: '테스트 관리자',
        userType: 'admin' as const,
        status: 'active' as const,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      // 인증 상태 설정
      setUser(mockUser);
      
      // 토큰도 설정 (API 호출을 위해)
      const mockToken = 'mock-jwt-token-' + Date.now();
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: mockUser,
          token: mockToken,
          isAuthenticated: true
        }
      }));

      console.log('개발 모드: 자동 로그인 활성화', mockUser);
    }
  }, [setUser]);

  return <>{children}</>;
};