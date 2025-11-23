/**
 * R-3-4: Account Shortcode - Enhanced Role-Based UX
 * User account/dashboard with full activeRole integration
 *
 * Usage: [account]
 *        [account dashboard_type="customer"]
 *        /account?dashboard=seller (query parameter support)
 *
 * Features:
 * - Query parameter support for role selection
 * - Role-based dashboard headers with unified UX
 * - Instant role switching without page reload
 * - Graceful fallback when role-specific dashboard is not available
 * - Login required guard for unauthenticated users
 */

import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShortcodeDefinition } from '@o4o/shortcodes';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Layers, User, ShoppingCart, Package, Handshake } from 'lucide-react';

// R-3-3: Import all role-based dashboard components
import CustomerDashboard from '../../shortcodes/CustomerDashboard';
import SellerDashboard from '../../shortcodes/SellerDashboard';
import SupplierDashboard from '../../shortcodes/SupplierDashboard';
import { PartnerDashboard } from '../../shortcodes/PartnerDashboard';

// R-3-4: Role configuration with display info
const ROLE_CONFIG: Record<string, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
}> = {
  customer: {
    label: '고객',
    icon: User,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    description: '고객 계정으로 로그인되어 있습니다'
  },
  seller: {
    label: '판매자',
    icon: ShoppingCart,
    color: 'bg-green-100 text-green-800 border-green-200',
    description: '판매자 계정으로 로그인되어 있습니다'
  },
  supplier: {
    label: '공급자',
    icon: Package,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    description: '공급자 계정으로 로그인되어 있습니다'
  },
  partner: {
    label: '파트너',
    icon: Handshake,
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    description: '파트너 계정으로 로그인되어 있습니다'
  },
  admin: {
    label: '관리자',
    icon: User,
    color: 'bg-red-100 text-red-800 border-red-200',
    description: '관리자 계정으로 로그인되어 있습니다'
  },
  administrator: {
    label: '관리자',
    icon: User,
    color: 'bg-red-100 text-red-800 border-red-200',
    description: '관리자 계정으로 로그인되어 있습니다'
  },
  manager: {
    label: '매니저',
    icon: User,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    description: '매니저 계정으로 로그인되어 있습니다'
  },
};

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
/**
 * R-4-2: Resolve dashboard component based on activeRole and user roles
 * Updated to use isActive instead of active
 */
function resolveDashboardComponent({
  activeRole,
  userAssignments,
}: {
  activeRole?: string | null;
  userAssignments?: Array<{ role: string; isActive: boolean }> | null;
}): React.ComponentType | null {
  // 1) activeRole priority
  if (activeRole && ROLE_DASHBOARD_MAP[activeRole]) {
    return ROLE_DASHBOARD_MAP[activeRole];
  }

  // 2) Find first role from assignments that has a dashboard
  // R-4-2: use isActive instead of active
  if (userAssignments && userAssignments.length > 0) {
    for (const assignment of userAssignments) {
      if (assignment.isActive && ROLE_DASHBOARD_MAP[assignment.role]) {
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
 * R-3-4: DashboardHeader - Common header for all role dashboards
 * Shows current role with icon and description
 */
const DashboardHeader: React.FC<{ role: string }> = ({ role }) => {
  const config = ROLE_CONFIG[role];

  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className={`mb-6 p-4 rounded-lg border ${config.color}`}>
      <div className="flex items-center gap-3">
        <Icon className="w-6 h-6" />
        <div>
          <h2 className="text-lg font-bold">현재 역할: {config.label}</h2>
          <p className="text-sm mt-1">{config.description}</p>
        </div>
      </div>
      <p className="text-xs mt-3 opacity-80">
        다른 역할로 전환하려면 오른쪽 상단 계정 메뉴를 이용하세요.
      </p>
    </div>
  );
};

/**
 * R-3-4: AccountComingSoon UI (Enhanced)
 * Shown when user's role doesn't have a dashboard yet
 */
const AccountComingSoon: React.FC<{ role?: string | null }> = ({ role }) => {
  const config = role ? ROLE_CONFIG[role] : null;
  const Icon = config?.icon || Layers;

  return (
    <div className="space-y-4">
      {/* Role header if available */}
      {role && <DashboardHeader role={role} />}

      {/* Coming soon message */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
            <Icon className="w-8 h-8 text-gray-500" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {config?.label} 대시보드 준비 중
        </h3>
        <p className="text-gray-600 mb-4">
          이 역할의 전용 대시보드는 아직 연결되지 않았습니다.
        </p>
        <p className="text-sm text-gray-500">
          빠른 시일 내에 서비스를 제공하겠습니다.
        </p>
      </div>
    </div>
  );
};

// R-3-4: Account Component with enhanced UX
export const AccountComponent: React.FC<{
  dashboardType?: 'customer' | 'seller' | 'supplier' | 'partner';
}> = ({
  dashboardType
}) => {
  const { user, isAuthenticated, isLoading: authLoading, activeRole, setActiveRole, getAvailableRoles } = useAuth();
  const location = useLocation();

  // R-3-4: Parse query parameters for role selection
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    const searchParams = new URLSearchParams(location.search);
    const dashboardParam = searchParams.get('dashboard');

    if (dashboardParam) {
      const availableRoles = getAvailableRoles();

      // Only set active role if it's valid and user has that role
      if (availableRoles.includes(dashboardParam)) {
        setActiveRole(dashboardParam);
      }
      // Invalid role parameter is silently ignored (no error)
    }
  }, [location.search, isAuthenticated, authLoading, getAvailableRoles, setActiveRole]);

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

  // R-3-4: Resolve dashboard component
  // Priority: 1) dashboardType attribute, 2) activeRole from context
  const roleToUse = dashboardType || activeRole;

  const DashboardComponent = resolveDashboardComponent({
    activeRole: roleToUse,
    userAssignments: user?.assignments,
  });

  // R-3-4: Wrap dashboard with role header
  const DashboardWithHeader = DashboardComponent
    ? () => (
        <div className="space-y-4">
          {roleToUse && <DashboardHeader role={roleToUse} />}
          <DashboardComponent />
        </div>
      )
    : null;

  // R-3-4: Show "Coming Soon" if no dashboard available
  if (!DashboardWithHeader) {
    return <AccountComingSoon role={roleToUse} />;
  }

  // R-3-4: Render the resolved dashboard with header
  return <DashboardWithHeader />;
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
