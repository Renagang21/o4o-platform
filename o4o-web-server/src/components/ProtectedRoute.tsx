import React, { ReactNode } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../../services/ecommerce/web/src/store/authStore';
import type { AuthState } from '../../../services/ecommerce/web/src/store/authStore';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((state: AuthState) => state.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

export default ProtectedRoute; 