/**
 * AppGuard Component
 *
 * Prevents API calls for uninstalled apps by wrapping dashboard content
 * with installation status checks.
 *
 * Usage:
 *   <AppGuard appId="membership-yaksa" appName="Membership">
 *     <MembershipDashboard />
 *   </AppGuard>
 */

import { FC, ReactNode } from 'react';
import { AlertCircle, Package, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStatus } from '@/hooks/useAppStatus';
import { LoadingState } from './LoadingStates';

export interface AppGuardProps {
  /** App ID to check installation status */
  appId: string;
  /** Display name for the app */
  appName: string;
  /** Custom fallback component when app is not installed */
  fallback?: ReactNode;
  /** Whether to require active status (not just installed) */
  requireActive?: boolean;
  /** Children to render when app is installed */
  children: ReactNode;
}

/**
 * Not Installed State Component
 */
interface NotInstalledStateProps {
  appName: string;
}

const NotInstalledState: FC<NotInstalledStateProps> = ({ appName }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4">
    <div className="bg-gray-100 rounded-full p-4 mb-4">
      <Package className="w-12 h-12 text-gray-400" />
    </div>
    <h2 className="text-xl font-semibold text-gray-800 mb-2">
      {appName} 앱이 설치되지 않았습니다
    </h2>
    <p className="text-gray-600 text-center max-w-md mb-6">
      이 기능을 사용하려면 {appName} 앱을 먼저 설치해야 합니다.
      앱스토어에서 설치할 수 있습니다.
    </p>
    <Link
      to="/admin/appstore"
      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      앱스토어로 이동
      <ArrowRight className="w-4 h-4" />
    </Link>
  </div>
);

/**
 * Inactive State Component
 */
interface InactiveStateProps {
  appName: string;
  appId: string;
}

const InactiveState: FC<InactiveStateProps> = ({ appName, appId }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4">
    <div className="bg-yellow-100 rounded-full p-4 mb-4">
      <AlertCircle className="w-12 h-12 text-yellow-600" />
    </div>
    <h2 className="text-xl font-semibold text-gray-800 mb-2">
      {appName} 앱이 비활성화 상태입니다
    </h2>
    <p className="text-gray-600 text-center max-w-md mb-6">
      이 기능을 사용하려면 {appName} 앱을 활성화해야 합니다.
    </p>
    <Link
      to={`/admin/appstore?activate=${appId}`}
      className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
    >
      앱 활성화하기
      <ArrowRight className="w-4 h-4" />
    </Link>
  </div>
);

/**
 * AppGuard - Guards content based on app installation status
 */
export const AppGuard: FC<AppGuardProps> = ({
  appId,
  appName,
  fallback,
  requireActive = false,
  children,
}) => {
  const { isLoading, isUnavailable, isInstalled, isActive } = useAppStatus();

  // Show loading state while checking app status
  if (isLoading) {
    return <LoadingState message={`${appName} 상태 확인 중...`} />;
  }

  // WO-O4O-ADMIN-APP-AVAILABILITY-READ-CONTRACT-FIX-V1:
  //   "상태 확인 실패" 는 "미설치/비활성" 과 구분해 안내한다(기존 동작 유지).
  if (isUnavailable) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          앱 상태를 확인할 수 없습니다
        </h2>
        <p className="text-gray-600 text-center max-w-md">
          잠시 후 다시 시도해 주세요.
        </p>
      </div>
    );
  }

  // Check installation status
  if (!isInstalled(appId)) {
    return fallback ? <>{fallback}</> : <NotInstalledState appName={appName} />;
  }

  // Check active status if required
  if (requireActive && !isActive(appId)) {
    return <InactiveState appName={appName} appId={appId} />;
  }

  // App is installed (and active if required) - render children
  return <>{children}</>;
};

/**
 * Hook for conditional API calls based on app status
 *
 * Usage:
 *   const { shouldCall, status } = useAppGuard('membership-yaksa');
 *   if (shouldCall) {
 *     await fetchMembershipData();
 *   }
 */
export function useAppGuard(appId: string, requireActive = false) {
  const { isLoading, error, isUnavailable, isInstalled, isActive } = useAppStatus();

  // WO-O4O-ADMIN-APP-AVAILABILITY-READ-CONTRACT-FIX-V1:
  //   로딩 중이거나 상태 확인 실패면 호출하지 않는다(비활성으로 확정하지도 않는다).
  const shouldCall = isLoading || isUnavailable
    ? false
    : requireActive
      ? isActive(appId)
      : isInstalled(appId);

  const status: 'unknown' | 'active' | 'inactive' | 'not-installed' =
    isLoading || isUnavailable
      ? 'unknown'
      : !isInstalled(appId)
        ? 'not-installed'
        : isActive(appId)
          ? 'active'
          : 'inactive';

  return {
    isLoading,
    error,
    isUnavailable,
    shouldCall,
    isInstalled: isInstalled(appId),
    isActive: isActive(appId),
    status,
  };
}

export default AppGuard;
