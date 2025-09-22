import { FC, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

/**
 * 하위 호환성을 위한 ProtectedRoute
 * 새로운 SSO 시스템과 기존 시스템 모두 지원
 */
const ProtectedRoute: FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
  const { state, user, isSSO } = useAuth();
  const location = useLocation();

  // 로딩 중일 때
  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <div className="text-gray-600">
            {isSSO ? '🔐 SSO 인증 확인 중...' : '🔑 인증 확인 중...'}
          </div>
        </div>
      </div>
    );
  }

  // 인증되지 않은 경우 로그인 페이지로 리다이렉트
  if (!state.isAuthenticated || !user) {
    return (
      <Navigate 
        to="/login" 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // 계정이 승인되지 않은 경우 (하위 호환성)
  if (!user.isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center p-6 bg-white rounded-lg shadow-lg">
          <div className="text-yellow-500 text-4xl mb-4">⏳</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">계정 승인 대기중</h2>
          <p className="text-gray-600 mb-4">
            계정이 아직 승인되지 않았습니다. 관리자의 승인을 기다려주세요.
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            로그인 페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 관리자 권한이 필요한 경우
  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // 개발 환경에서 인증 상태 표시
  return (
    <div>
      {import.meta.env.DEV && (
        <div className="fixed top-0 right-0 z-50 p-2 bg-black bg-opacity-75 text-white text-xs rounded-bl">
          <div>User: {user.name || user.email}</div>
          <div>Role: {user.role}</div>
          <div>Auth: {isSSO ? 'SSO' : 'Legacy'}</div>
          <div>Active: {user.isApproved ? '✅' : '❌'}</div>
        </div>
      )}
      {children}
    </div>
  );
};

export default ProtectedRoute;
