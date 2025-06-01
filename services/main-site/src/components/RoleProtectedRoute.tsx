import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// 예시: user context에서 role을 가져온다고 가정
// 실제로는 AuthContext 등에서 가져와야 함
const useUser = () => {
  // TODO: 실제 인증 컨텍스트로 교체
  return { role: 'b2c' } as { role: string };
};

interface RoleProtectedRouteProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user || !allowedRoles.some(role => user.roles.includes(role))) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default RoleProtectedRoute; 
