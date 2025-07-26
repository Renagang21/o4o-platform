import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { UserType } from '../../types/user';

interface PrivateRouteProps {
  children: ReactNode;
  allowedUserTypes?: UserType[];
}

export default function PrivateRoute({ children, allowedUserTypes }: PrivateRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

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
      case 'customer':
        return <Navigate to="/shop" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}