/**
 * Account Shortcode
 * User account/dashboard with auth guard
 *
 * Usage: [account]
 *        [account dashboard_type="customer"]
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShortcodeDefinition, ShortcodeRenderer } from '@o4o/shortcodes';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle } from 'lucide-react';

// Account Component with auth guard
export const AccountComponent: React.FC<{
  dashboardType?: 'customer' | 'seller' | 'supplier' | 'partner';
}> = ({
  dashboardType = 'customer'
}) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const location = useLocation();

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

  // Login required guard (similar to RoleApplyForm pattern)
  if (!authLoading && !isAuthenticated) {
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
  }

  // Authenticated - show dashboard using ShortcodeRenderer
  // For now, we only support customer dashboard
  // In the future, we can add seller/supplier/partner dashboards
  const dashboardContent = dashboardType === 'customer'
    ? '[customer_dashboard]'
    : `[${dashboardType}_dashboard]`;

  return <ShortcodeRenderer content={dashboardContent} />;
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
