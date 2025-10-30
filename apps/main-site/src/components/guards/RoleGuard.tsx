/**
 * 역할 기반 접근 제어 컴포넌트
 *
 * - 특정 역할을 가진 사용자만 콘텐츠에 접근 가능
 * - 권한 없는 사용자는 fallback 메시지 또는 리디렉션
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/user';
import { trackAccessDenied } from '../../utils/analytics';

interface RoleGuardProps {
  /**
   * 접근을 허용할 역할 목록
   */
  allowedRoles: UserRole[] | string[];

  /**
   * 권한이 없을 때 리디렉션할 경로 (기본값: '/')
   */
  redirectTo?: string;

  /**
   * 권한이 없을 때 보여줄 fallback UI (redirectTo보다 우선)
   */
  fallback?: React.ReactNode;

  /**
   * 보호할 자식 컴포넌트
   */
  children: React.ReactNode;
}

/**
 * 역할 기반 접근 가드
 *
 * 사용 예시:
 * ```tsx
 * <RoleGuard allowedRoles={['seller']}>
 *   <SellerHub />
 * </RoleGuard>
 * ```
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  redirectTo = '/',
  fallback,
  children
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // 로딩 중
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 미인증 사용자 - 로그인 페이지로 리디렉션
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 현재 역할 확인
  const currentRole = user.currentRole || user.roles?.[0] || user.role;

  // 역할 권한 체크
  const hasAccess = currentRole && allowedRoles.includes(currentRole);

  // 권한 없음
  if (!hasAccess) {
    // 분석 이벤트: 접근 거부
    trackAccessDenied(allowedRoles.join(','), currentRole || 'unknown');

    // Fallback UI가 제공된 경우
    if (fallback) {
      return <>{fallback}</>;
    }

    // 기본: 리디렉션
    return <Navigate to={redirectTo} replace />;
  }

  // 권한 있음 - 자식 렌더링
  return <>{children}</>;
};

/**
 * 권한 없음 기본 메시지 컴포넌트
 */
export const AccessDenied: React.FC<{ message?: string }> = ({
  message = '이 페이지에 접근할 권한이 없습니다.'
}) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">접근 거부</h1>
        <p className="text-gray-600 mb-6">{message}</p>
        <a
          href="/"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 transition-colors"
        >
          홈으로 돌아가기
        </a>
      </div>
    </div>
  );
};

export default RoleGuard;
