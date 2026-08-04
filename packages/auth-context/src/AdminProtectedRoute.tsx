import { FC, ReactNode, useEffect  } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { hasRequiredPermissions, hasRequiredRoles } from './adminRouteAccess';

interface AdminProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
  /**
   * 선언된 permission 키.
   *
   * **주의: 이것은 permission 검사가 아니다.** 백엔드 인증 응답이 `user.permissions` 를 채우지
   * 않으므로(2026-08-04 확인) 현재는 "관리자 대시보드 역할 게이트"로만 동작한다.
   * `user.permissions` 가 실제로 채워지면 그때부터 자동으로 실검사로 승격된다 —
   * `hasRequiredPermissions()` 참조.
   */
  requiredPermissions?: string[];
  showContactAdmin?: boolean;
}

const AccessDeniedComponent: FC<{ showContactAdmin?: boolean }> = ({ 
  showContactAdmin = false 
}) => (
  <div style={{ 
    padding: '2rem', 
    textAlign: 'center',
    background: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '0.375rem',
    margin: '1rem'
  }}>
    <h2 style={{ color: '#dc3545', marginBottom: '1rem' }}>접근 권한이 없습니다</h2>
    <p style={{ color: '#6c757d', marginBottom: '1rem' }}>
      이 페이지에 접근하기 위한 권한이 부족합니다.
    </p>
    {showContactAdmin && (
      <p style={{ color: '#6c757d' }}>
        관리자에게 문의하시기 바랍니다.
      </p>
    )}
  </div>
);

export const AdminProtectedRoute: FC<AdminProtectedRouteProps> = ({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  showContactAdmin = false
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 로딩이 완전히 완료되고 인증되지 않은 경우에만 리다이렉트
    // localStorage에 저장된 토큰이 있는지 먼저 확인
    const hasStoredAuth = () => {
      const token = localStorage.getItem('accessToken') ||
                   localStorage.getItem('token') ||
                   localStorage.getItem('authToken');
      const adminStorage = localStorage.getItem('admin-auth-storage');
      return !!(token || adminStorage);
    };

    let timeoutId: number | undefined;

    if (!isLoading && !isAuthenticated) {
      // 저장된 인증 정보가 있으면 더 기다림
      const delay = hasStoredAuth() ? 500 : 100;

      timeoutId = window.setTimeout(() => {
        // 다시 한 번 인증 상태와 저장된 토큰 확인
        if (!isAuthenticated && !hasStoredAuth()) {
          navigate('/login', {
            replace: true,
            state: { from: location.pathname }
          });
        }
      }, delay);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isAuthenticated, isLoading, navigate, location, user]);

  // 로딩 중인 경우 - 더 나은 UX를 위한 로딩 화면
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            border: '4px solid #e2e8f0', 
            borderTop: '4px solid #3b82f6', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#64748b', fontSize: '14px' }}>인증 상태 확인 중...</p>
        </div>
      </div>
    );
  }

  // 토큰 복원 중이거나 인증되지 않은 경우 잠시 대기
  if (!isAuthenticated || !user) {
    // 인증 상태가 불분명한 경우 짧은 로딩 표시
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px'
      }}>
        <div style={{ 
          width: '24px', 
          height: '24px', 
          border: '2px solid #e2e8f0', 
          borderTop: '2px solid #6366f1', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  // 역할 기반 접근 제어
  // 역할 출처는 user.role / user.activeRole.name / user.roles[] 세 곳 모두를 본다(하위 호환).
  if (requiredRoles.length > 0) {
    if (!hasRequiredRoles(user, requiredRoles)) {
      return <AccessDeniedComponent showContactAdmin={showContactAdmin} />;
    }
  }

  // 권한 기반 접근 제어 — 판정 의미는 hasRequiredPermissions() 주석 참조.
  if (requiredPermissions.length > 0) {
    if (!hasRequiredPermissions(user, requiredPermissions)) {
      return <AccessDeniedComponent showContactAdmin={showContactAdmin} />;
    }
  }

  // 모든 조건을 만족하면 자식 컴포넌트 렌더링
  return <>{children}</>;
};

// CSS 애니메이션을 위한 스타일 태그 추가
if (typeof document !== 'undefined' && !document.getElementById('auth-spinner-styles')) {
  const style = document.createElement('style');
  style.id = 'auth-spinner-styles';
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}