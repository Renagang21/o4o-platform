import { FC, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '../contexts/AuthContext';

interface SSOProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: UserRole[]; // 허용된 역할들
  requireAdmin?: boolean; // 하위 호환성
  fallbackPath?: string; // 권한 없을 때 리다이렉트할 경로
}

const SSOProtectedRoute: FC<SSOProtectedRouteProps> = ({ 
  children, 
  requiredRoles = [], 
  requireAdmin = false,
  fallbackPath = '/dashboard'
}) => {
  const { state, user, isSSO } = useAuth();
  const location = useLocation();

  // 로딩 중일 때
  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
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

  // 계정이 비활성화된 경우
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
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            로그인 페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 하위 호환성: requireAdmin 플래그 처리
  if (requireAdmin && user.role !== 'admin') {
    return (
      <Navigate 
        to={fallbackPath} 
        replace 
      />
    );
  }

  // 특정 역할 요구사항 확인
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center p-6 bg-white rounded-lg shadow-lg">
          <div className="text-red-500 text-4xl mb-4">🚫</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">접근 권한 없음</h2>
          <p className="text-gray-600 mb-4">
            이 페이지에 접근할 권한이 없습니다.
          </p>
          <div className="text-sm text-gray-500 mb-4">
            <div>현재 역할: <span className="font-medium">{user.role}</span></div>
            <div>필요 역할: <span className="font-medium">{requiredRoles.join(', ')}</span></div>
          </div>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
          >
            이전 페이지로
          </button>
          <button
            onClick={() => window.location.href = fallbackPath}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            홈으로
          </button>
        </div>
      </div>
    );
  }

  // 모든 검사를 통과한 경우 자식 컴포넌트 렌더링
  return (
    <div>
      {/* 개발 환경에서 디버그 정보 표시 */}
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

export default SSOProtectedRoute;