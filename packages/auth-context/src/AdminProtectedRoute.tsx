import { FC, ReactNode, useEffect  } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

interface AdminProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
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
    // 추가적인 지연을 두어 토큰 복원 프로세스가 완료될 시간을 확보
    let timeoutId: number | undefined;
    
    if (!isLoading && !isAuthenticated) {
      timeoutId = window.setTimeout(() => {
        // 한 번 더 확인 후 리다이렉트
        if (!isAuthenticated) {
          navigate('/login', {
            replace: true,
            state: { from: location.pathname }
          });
        }
      }, 100); // 100ms 지연으로 토큰 복원 완료 대기
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isAuthenticated, isLoading, navigate, location]);

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
  if (requiredRoles.length > 0) {
    const userRole = user.role;
    const hasRequiredRole = requiredRoles.includes(userRole);
    
    if (!hasRequiredRole) {
      return <AccessDeniedComponent showContactAdmin={showContactAdmin} />;
    }
  }

  // 권한 기반 접근 제어는 현재 User 타입에 없으므로 기본적으로 통과
  if (requiredPermissions.length > 0) {
    // 향후 확장을 위한 구조 유지
    // 현재는 admin 역할이면 모든 권한을 가진 것으로 간주
    const isAdmin = user.role === 'admin';
    
    if (!isAdmin) {
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