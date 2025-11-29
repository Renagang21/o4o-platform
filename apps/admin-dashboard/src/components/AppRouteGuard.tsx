import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppStatus } from '@/hooks/useAppStatus';

interface AppRouteGuardProps {
  /** App identifier to check */
  appId: string;
  /** Child component to render if app is active */
  children: React.ReactElement;
  /** Optional redirect path (defaults to /error/app-disabled) */
  redirectTo?: string;
}

/**
 * AppRouteGuard Component
 *
 * Guards routes based on app activation status.
 * Only allows access if the specified app is active.
 *
 * @example
 * ```tsx
 * <Route
 *   path="/forum/*"
 *   element={
 *     <AppRouteGuard appId="forum">
 *       <ForumPage />
 *     </AppRouteGuard>
 *   }
 * />
 * ```
 */
export const AppRouteGuard: React.FC<AppRouteGuardProps> = ({
  appId,
  children,
  redirectTo = '/error/app-disabled',
}) => {
  const { isLoading, isActive } = useAppStatus();

  // Show loading state while checking app status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // Redirect if app is not active
  if (!isActive(appId)) {
    return <Navigate to={`${redirectTo}?app=${appId}`} replace />;
  }

  // Render children if app is active
  return children;
};
