import { FC, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '../contexts/AuthContext';

interface RoleProtectedRouteProps {
  allowedRoles: UserRole[];
  children: ReactNode;
}

const RoleProtectedRoute: FC<RoleProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/forbidden" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default RoleProtectedRoute;
