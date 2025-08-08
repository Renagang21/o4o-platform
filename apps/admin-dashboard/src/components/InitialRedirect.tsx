import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@o4o/auth-context';

const InitialRedirect = () => {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const location = useLocation();

  // 로딩 중인 경우 로딩 화면 표시
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-blue"></div>
      </div>
    );
  }

  // 인증되지 않은 경우 로그인 페이지로
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 관리자가 아닌 경우 권한 없음 표시
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">접근 권한이 없습니다</h1>
          <p className="mt-2 text-gray-600">관리자 권한이 필요합니다.</p>
        </div>
      </div>
    );
  }

  // 인증된 관리자는 WordPress 대시보드로 리다이렉트
  return <Navigate to="/admin" replace />;
};

export default InitialRedirect;