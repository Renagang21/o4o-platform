import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserType } from '../../types/user';

interface PrivateRouteProps {
  children: ReactNode;
  allowedUserTypes?: UserType[];
}

export default function PrivateRoute({ children, allowedUserTypes }: PrivateRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  // 개발 모드에서 VITE_USE_MOCK이 true인 경우 인증 체크 우회
  // 임시: 프로덕션에서도 VITE_USE_MOCK 체크
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    return <>{children}</>;
  }

  // 인증되지 않은 경우 로그인 페이지로 리다이렉트
  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // 특정 사용자 타입만 허용하는 경우
  if (allowedUserTypes && !allowedUserTypes.includes(user.userType)) {
    // 권한이 없는 경우 사용자 타입별 기본 페이지로 리다이렉트
    switch (user.userType) {
      case 'admin':
        return <Navigate to="/admin/dashboard" replace />;
      case 'supplier':
        return <Navigate to="/supplier/dashboard" replace />;
      case 'retailer':
        return <Navigate to="/retailer/dashboard" replace />;
      case 'user':
        return <Navigate to="/shop" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}