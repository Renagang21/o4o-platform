import { FC, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface RoleGuardProps {
  role: 'supplier' | 'seller' | 'partner';
  children: ReactNode;
}

/**
 * P0 RBAC: RoleGuard component
 * - Checks if user has active role assignment
 * - Redirects to status page if not approved
 * - Shows loading state while auth is being checked
 */
export const RoleGuard: FC<RoleGuardProps> = ({ role, children }) => {
  const { user, isLoading, hasRole } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">인증 확인 중...</p>
        </div>
      </div>
    );
  }

  // Not logged in - redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has the required role
  if (!hasRole(role)) {
    // Redirect to role-specific status page
    return <Navigate to={`/apply/${role}/status`} replace />;
  }

  // User has required role - render children
  return <>{children}</>;
};

export default RoleGuard;
