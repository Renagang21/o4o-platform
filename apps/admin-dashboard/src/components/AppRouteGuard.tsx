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
  const { isLoading, isUnavailable, isActive } = useAppStatus();

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

  // WO-O4O-ADMIN-APP-AVAILABILITY-READ-CONTRACT-FIX-V1:
  //   "상태 확인 실패" 를 "앱 비활성" 으로 해석하지 않는다.
  //   기존에는 조회 실패 시 apps=[] → isActive=false → app-disabled 로 보내면서
  //   정상 활성 앱을 비활성이라고 사용자에게 잘못 안내했다.
  //   실패 시에는 app-disabled 로 보내지 않고 확인 실패임을 그대로 알린다.
  if (isUnavailable) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center px-4">
          <p className="text-lg font-semibold text-gray-800 mb-1">앱 상태를 확인할 수 없습니다</p>
          <p className="text-gray-600">잠시 후 다시 시도해 주세요.</p>
        </div>
      </div>
    );
  }

  // Redirect only when the app is genuinely inactive
  if (!isActive(appId)) {
    return <Navigate to={`${redirectTo}?app=${appId}`} replace />;
  }

  // Render children if app is active
  return children;
};
