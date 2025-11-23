/**
 * R-6-3: Account Shortcode - Modernized Role-Based Dashboard
 * User account/dashboard with full activeRole integration
 *
 * Usage: [account]
 *        [account dashboard_type="customer"]
 *        /account?dashboard=seller (query parameter support)
 *
 * Features:
 * - Query parameter support for role selection
 * - Modernized role-based dashboard headers with unified UX
 * - Instant role switching without page reload
 * - Graceful fallback when role-specific dashboard is not available
 * - Login required guard for unauthenticated users
 * - Consistent styling with Seller/Supplier/Partner dashboards
 */

import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShortcodeDefinition } from '@o4o/shortcodes';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertCircle,
  User,
  ShoppingCart,
  Package,
  Handshake,
  Shield,
  Briefcase
} from 'lucide-react';
import { DashboardSkeleton } from '../../common/Skeleton';

// Import all role-based dashboard components
import CustomerDashboard from '../../shortcodes/CustomerDashboard';
import SellerDashboard from '../../shortcodes/SellerDashboard';
import SupplierDashboard from '../../shortcodes/SupplierDashboard';
import { PartnerDashboard } from '../../shortcodes/PartnerDashboard';

// R-6-3: Modernized role configuration with Lucide icons
const ROLE_CONFIG: Record<string, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}> = {
  customer: {
    label: '고객',
    icon: User,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: '고객 계정으로 로그인되어 있습니다'
  },
  seller: {
    label: '판매자',
    icon: ShoppingCart,
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    description: '판매자 계정으로 로그인되어 있습니다'
  },
  supplier: {
    label: '공급자',
    icon: Package,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: '공급자 계정으로 로그인되어 있습니다'
  },
  partner: {
    label: '파트너',
    icon: Handshake,
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    description: '파트너 계정으로 로그인되어 있습니다'
  },
  admin: {
    label: '관리자',
    icon: Shield,
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    description: '관리자 계정으로 로그인되어 있습니다'
  },
  administrator: {
    label: '관리자',
    icon: Shield,
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    description: '관리자 계정으로 로그인되어 있습니다'
  },
  manager: {
    label: '매니저',
    icon: Briefcase,
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    description: '매니저 계정으로 로그인되어 있습니다'
  },
};

// Role to Dashboard mapping
const ROLE_DASHBOARD_MAP: Record<string, React.ComponentType | null> = {
  customer: CustomerDashboard,
  seller: SellerDashboard,
  supplier: SupplierDashboard,
  partner: PartnerDashboard,
  // Admin role uses customer dashboard for now
  admin: CustomerDashboard,
  administrator: CustomerDashboard,
  manager: CustomerDashboard,
};

/**
 * R-6-3: Resolve dashboard component based on activeRole and user roles
 * Updated to use isActive instead of active (R-4-2)
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
 * R-6-3: LoginRequiredFallback UI (Modernized)
 * Shown when user is not authenticated
 */
const LoginRequiredFallback: React.FC = () => {
  const location = useLocation();

  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-8">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-2xl font-bold text-blue-900 mb-2">
          로그인이 필요합니다
        </h3>
        <p className="text-blue-700 mb-6 max-w-md">
          계정 페이지는 로그인 후 이용하실 수 있습니다.
        </p>
        <Link
          to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm hover:shadow-md"
        >
          로그인하기 →
        </Link>
      </div>
    </div>
  );
};

/**
 * R-6-3: DashboardHeader - Modernized header for all role dashboards
 * Shows current role with icon and description
 */
const DashboardHeader: React.FC<{ role: string }> = ({ role }) => {
  const config = ROLE_CONFIG[role];

  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className={`mb-6 p-6 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
      <div className="flex items-center gap-4">
        <div className={`flex-shrink-0 w-12 h-12 rounded-lg bg-white shadow-sm flex items-center justify-center ${config.color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            현재 역할: {config.label}
          </h2>
          <p className="text-sm text-gray-600">{config.description}</p>
        </div>
      </div>
      <div className={`mt-4 pt-4 border-t ${config.borderColor}`}>
        <p className="text-xs text-gray-600">
          💡 다른 역할로 전환하려면 오른쪽 상단 계정 메뉴를 이용하세요.
        </p>
      </div>
    </div>
  );
};

/**
 * R-6-3: AccountComingSoon UI (Modernized)
 * Shown when user's role doesn't have a dashboard yet
 */
const AccountComingSoon: React.FC<{ role?: string | null }> = ({ role }) => {
  const config = role ? ROLE_CONFIG[role] : null;
  const Icon = config?.icon || User;

  return (
    <div className="space-y-6">
      {/* Role header if available */}
      {role && <DashboardHeader role={role} />}

      {/* Coming soon message */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-12 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center">
            <Icon className="w-10 h-10 text-gray-400" />
          </div>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">
          {config?.label} 대시보드 준비 중
        </h3>
        <p className="text-gray-600 mb-2 max-w-md mx-auto">
          이 역할의 전용 대시보드는 아직 연결되지 않았습니다.
        </p>
        <p className="text-sm text-gray-500">
          빠른 시일 내에 서비스를 제공하겠습니다.
        </p>
      </div>
    </div>
  );
};

// R-6-3: Account Component with modernized UX
export const AccountComponent: React.FC<{
  dashboardType?: 'customer' | 'seller' | 'supplier' | 'partner';
}> = ({
  dashboardType
}) => {
  const { user, isAuthenticated, isLoading: authLoading, activeRole, setActiveRole, getAvailableRoles } = useAuth();
  const location = useLocation();

  // Parse query parameters for role selection
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

  // Loading state with skeleton
  if (authLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  // Login required guard
  if (!authLoading && !isAuthenticated) {
    return <LoginRequiredFallback />;
  }

  // Resolve dashboard component
  // Priority: 1) dashboardType attribute, 2) activeRole from context
  const roleToUse = dashboardType || activeRole;

  const DashboardComponent = resolveDashboardComponent({
    activeRole: roleToUse,
    userAssignments: user?.assignments,
  });

  // Wrap dashboard with role header
  const DashboardWithHeader = DashboardComponent
    ? () => (
        <div className="space-y-6">
          {roleToUse && <DashboardHeader role={roleToUse} />}
          <DashboardComponent />
        </div>
      )
    : null;

  // Show "Coming Soon" if no dashboard available
  if (!DashboardWithHeader) {
    return <AccountComingSoon role={roleToUse} />;
  }

  // Render the resolved dashboard with header
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
