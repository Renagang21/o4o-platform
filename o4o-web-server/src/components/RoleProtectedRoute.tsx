import React, { ReactNode } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../../services/ecommerce/web/src/store/authStore';
import type { AuthState } from '../../../services/ecommerce/web/src/store/authStore';

interface RoleProtectedRouteProps {
  roles: string[];
  children: ReactNode;
}

const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ roles, children }) => {
  const isAuthenticated = useAuthStore((state: AuthState) => state.isAuthenticated);
  const user = useAuthStore((state: AuthState) => state.user);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }
  return <>{children}</>;
};

export default RoleProtectedRoute; 