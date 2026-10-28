import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@o4o/auth-context';

const InitialRedirect = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const isPlatformAdmin = user?.roles?.includes('platform:super_admin') === true;

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

  if (!isPlatformAdmin) return <Navigate to="/operations" replace />;

  // 인증된 관리자는 WordPress 대시보드로 리다이렉트
  return <Navigate to="/admin" replace />;
};

export default InitialRedirect;