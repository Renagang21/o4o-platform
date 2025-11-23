/**
 * R-3-3: Account Shortcode - Role-Based Dashboard Routing
 * User account/dashboard with auth guard and activeRole support
 *
 * Usage: [account]
 *        [account dashboard_type="customer"]
 *
 * Features:
 * - Uses AuthContext.activeRole to determine which dashboard to show
 * - Graceful fallback when role-specific dashboard is not available
 * - Login required guard for unauthenticated users
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShortcodeDefinition } from '@o4o/shortcodes';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Layers } from 'lucide-react';

// R-3-3: Import all role-based dashboard components
import CustomerDashboard from '../../shortcodes/CustomerDashboard';
import SellerDashboard from '../../shortcodes/SellerDashboard';
import SupplierDashboard from '../../shortcodes/SupplierDashboard';
import { PartnerDashboard } from '../../shortcodes/PartnerDashboard';

// R-3-3: Role to Dashboard mapping
const ROLE_DASHBOARD_MAP: Record<string, React.ComponentType | null> = {
  customer: CustomerDashboard,
  seller: SellerDashboard,
  supplier: SupplierDashboard,
  partner: PartnerDashboard,
  // Admin role can use customer dashboard for now
  admin: CustomerDashboard,
  administrator: CustomerDashboard,
  manager: CustomerDashboard,
};

/**
 * R-3-3: Resolve dashboard component based on activeRole and user roles
 *
 * Priority:
 * 1. activeRole - if it has a mapped dashboard, use it
 * 2. user.assignments - find first role that has a dashboard
 * 3. Fallback to null (will show "Coming Soon" UI)
 */
function resolveDashboardComponent({
  activeRole,
  userAssignments,
}: {
  activeRole?: string | null;
  userAssignments?: Array<{ role: string; active: boolean }> | null;
}): React.ComponentType | null {
  // 1) activeRole priority
  if (activeRole && ROLE_DASHBOARD_MAP[activeRole]) {
    return ROLE_DASHBOARD_MAP[activeRole];
  }

  // 2) Find first role from assignments that has a dashboard
  if (userAssignments && userAssignments.length > 0) {
    for (const assignment of userAssignments) {
      if (assignment.active && ROLE_DASHBOARD_MAP[assignment.role]) {
        return ROLE_DASHBOARD_MAP[assignment.role];
      }
    }
  }

  // 3) No dashboard found - return null for fallback
  return null;
}

/**
 * R-3-3: LoginRequiredFallback UI
 * Shown when user is not authenticated
 */
const LoginRequiredFallback: React.FC = () => {
  const location = useLocation();

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <AlertCircle className="w-8 h-8 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-blue-900 mb-2">
            로그인이 필요합니다
          </h3>
          <p className="text-blue-700 mb-4">
            계정 페이지는 로그인 후 이용하실 수 있습니다.
          </p>
          <Link
            to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            로그인하기 →
          </Link>
        </div>
      </div>
    </div>
  );
};

/**
 * R-3-3: AccountComingSoon UI
 * Shown when user's role doesn't have a dashboard yet
 */
const AccountComingSoon: React.FC = () => {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
          <Layers className="w-8 h-8 text-gray-500" />
        </div>
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        계정 대시보드 준비 중
      </h3>
      <p className="text-gray-600 mb-4">
        현재 역할에 해당하는 전용 대시보드가 아직 연결되지 않았습니다.
      </p>
      <p className="text-sm text-gray-500">
        빠른 시일 내에 서비스를 제공하겠습니다.
      </p>
    </div>
  );
};

// R-3-3: Account Component with activeRole support
export const AccountComponent: React.FC<{
  dashboardType?: 'customer' | 'seller' | 'supplier' | 'partner';
}> = ({
  dashboardType
}) => {
  const { user, isAuthenticated, isLoading: authLoading, activeRole } = useAuth();

  // Loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // R-3-3: Login required guard
  if (!authLoading && !isAuthenticated) {
    return <LoginRequiredFallback />;
  }

  // R-3-3: Resolve dashboard component
  // If dashboardType is explicitly provided, use it (backward compatibility)
  // Otherwise, use activeRole from AuthContext
  const roleToUse = dashboardType || activeRole;

  const DashboardComponent = resolveDashboardComponent({
    activeRole: roleToUse,
    userAssignments: user?.assignments,
  });

  // R-3-3: Show "Coming Soon" if no dashboard available
  if (!DashboardComponent) {
    return <AccountComingSoon />;
  }

  // R-3-3: Render the resolved dashboard
  return <DashboardComponent />;
};

// Account Shortcode Definition
export const accountShortcode: ShortcodeDefinition = {
  name: 'account',
  description: '계정/마이페이지 컴포넌트 (인증 가드 포함)',
  attributes: {
    dashboardType: {
      type: 'string',
      required: false,
      default: 'customer'
    }
  },
  component: ({ attributes }) => (
    <AccountComponent
      dashboardType={attributes.dashboard_type as any || attributes.dashboardType as any}
    />
  )
};

// Default export
export default AccountComponent;
