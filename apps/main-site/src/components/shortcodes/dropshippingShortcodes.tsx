/**
 * Dropshipping Shortcodes for Main Site
 * Comprehensive registration of all dropshipping-related shortcodes
 */

import React from 'react';
import { ShortcodeAttributes, ShortcodeHandler } from '@/utils/shortcodeParser';

// Import existing dashboard components
const PartnerDashboardLazy = React.lazy(() =>
  import('./PartnerDashboard').then(module => ({ default: module.PartnerDashboard }))
);

const SupplierDashboardLazy = React.lazy(() =>
  import('./SupplierDashboard').then(module => ({ default: module.SupplierDashboard }))
);

// Loading fallback component
const LoadingFallback: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">{message}</p>
    </div>
  </div>
);

// Placeholder component for not-yet-implemented shortcodes
const PlaceholderShortcode: React.FC<{
  name: string;
  message?: string;
}> = ({ name, message }) => (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 my-4">
    <div className="flex items-center gap-2 text-yellow-800">
      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <span className="font-medium">Component In Development</span>
    </div>
    <p className="text-sm text-yellow-700 mt-2">
      {message || `The [${name}] shortcode is registered but the component is not yet implemented.`}
    </p>
    <p className="text-xs text-yellow-600 mt-1">
      This will be available in a future update.
    </p>
  </div>
);

// Partner Dashboard Wrapper
const PartnerDashboardWrapper: React.FC<{ tab?: string }> = ({ tab = 'overview' }) => (
  <React.Suspense fallback={<LoadingFallback message="Loading partner dashboard..." />}>
    <PartnerDashboardLazy defaultTab={tab} />
  </React.Suspense>
);

// Supplier Dashboard Wrapper
const SupplierDashboardWrapper: React.FC<{ period?: string }> = ({ period = '30d' }) => (
  <React.Suspense fallback={<LoadingFallback message="Loading supplier dashboard..." />}>
    <SupplierDashboardLazy defaultPeriod={period} />
  </React.Suspense>
);

// All dropshipping shortcode handlers
export const dropshippingShortcodes: ShortcodeHandler[] = [
  // ===== PARTNER SHORTCODES =====
  {
    name: 'partner_dashboard',
    render: (attrs: ShortcodeAttributes) => (
      <PartnerDashboardWrapper tab={attrs.tab as string} />
    )
  },
  {
    name: 'partner_products',
    render: () => <PlaceholderShortcode name="partner_products" />
  },
  {
    name: 'partner_commissions',
    render: () => <PlaceholderShortcode name="partner_commissions" />
  },
  {
    name: 'partner_link_generator',
    render: () => <PlaceholderShortcode name="partner_link_generator" />
  },
  {
    name: 'partner_commission_dashboard',
    render: () => <PlaceholderShortcode name="partner_commission_dashboard" />
  },
  {
    name: 'partner_payout_requests',
    render: () => <PlaceholderShortcode name="partner_payout_requests" />
  },
  {
    name: 'partner_performance_chart',
    render: () => <PlaceholderShortcode name="partner_performance_chart" />
  },
  {
    name: 'partner_link_stats',
    render: () => <PlaceholderShortcode name="partner_link_stats" />
  },
  {
    name: 'partner_marketing_materials',
    render: () => <PlaceholderShortcode name="partner_marketing_materials" />
  },
  {
    name: 'partner_referral_tree',
    render: () => <PlaceholderShortcode name="partner_referral_tree" />
  },
  {
    name: 'partner_quick_stats',
    render: () => <PlaceholderShortcode name="partner_quick_stats" />
  },
  {
    name: 'partner_leaderboard',
    render: () => <PlaceholderShortcode name="partner_leaderboard" />
  },
  {
    name: 'partner_tier_progress',
    render: () => <PlaceholderShortcode name="partner_tier_progress" />
  },

  // ===== SUPPLIER SHORTCODES =====
  {
    name: 'supplier_dashboard',
    render: (attrs: ShortcodeAttributes) => (
      <SupplierDashboardWrapper period={attrs.period as string} />
    )
  },
  {
    name: 'supplier_products',
    render: () => <PlaceholderShortcode name="supplier_products" />
  },
  {
    name: 'supplier_product_editor',
    render: () => <PlaceholderShortcode name="supplier_product_editor" />
  },
  {
    name: 'supplier_analytics',
    render: () => <PlaceholderShortcode name="supplier_analytics" />
  },
  {
    name: 'supplier_approval_queue',
    render: () => <PlaceholderShortcode name="supplier_approval_queue" />
  },

  // ===== SELLER SHORTCODES =====
  {
    name: 'seller_dashboard',
    render: () => <PlaceholderShortcode name="seller_dashboard" />
  },
  {
    name: 'seller_products',
    render: () => <PlaceholderShortcode name="seller_products" />
  },
  {
    name: 'seller_settlement',
    render: () => <PlaceholderShortcode name="seller_settlement" />
  },
  {
    name: 'seller_analytics',
    render: () => <PlaceholderShortcode name="seller_analytics" />
  },
  {
    name: 'seller_pricing_manager',
    render: () => <PlaceholderShortcode name="seller_pricing_manager" />
  },

  // ===== AFFILIATE SHORTCODES =====
  {
    name: 'affiliate_dashboard',
    render: () => <PlaceholderShortcode name="affiliate_dashboard" />
  },

  // ===== CORE DROPSHIPPING SHORTCODES =====
  {
    name: 'user_dashboard',
    render: () => <PlaceholderShortcode name="user_dashboard" />
  },
  {
    name: 'role_verification',
    render: () => <PlaceholderShortcode name="role_verification" />
  },
  {
    name: 'profile_manager',
    render: () => <PlaceholderShortcode name="profile_manager" />
  },
  {
    name: 'role_switcher',
    render: () => <PlaceholderShortcode name="role_switcher" />
  }
];
