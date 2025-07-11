import React, { ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface AdminProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  showContactAdmin?: boolean;
}

const AccessDeniedComponent: React.FC<{ showContactAdmin?: boolean }> = ({ 
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

export const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  showContactAdmin = false
}) => {
  const { user, isAuthenticated } = useAuth();

  // 인증되지 않은 경우
  if (!isAuthenticated || !user) {
    return <AccessDeniedComponent showContactAdmin={showContactAdmin} />;
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