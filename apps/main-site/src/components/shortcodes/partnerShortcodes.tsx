/**
 * Dropshipping Shortcodes for Main Site
 * Partner, Supplier, and Seller dashboard shortcodes
 */

import React from 'react';
import { ShortcodeAttributes, ShortcodeHandler } from '@/utils/shortcodeParser';

// Lazy load the dashboard components
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

// Partner Dashboard Component with Suspense fallback
const PartnerDashboardWrapper: React.FC<{
  tab?: string;
}> = ({ tab = 'overview' }) => {
  return (
    <React.Suspense fallback={<LoadingFallback message="Loading partner dashboard..." />}>
      <PartnerDashboardLazy defaultTab={tab} />
    </React.Suspense>
  );
};

// Supplier Dashboard Component with Suspense fallback
const SupplierDashboardWrapper: React.FC<{
  period?: string;
}> = ({ period = '30d' }) => {
  return (
    <React.Suspense fallback={<LoadingFallback message="Loading supplier dashboard..." />}>
      <SupplierDashboardLazy defaultPeriod={period} />
    </React.Suspense>
  );
};

// Dropshipping shortcode handlers
export const partnerShortcodes: ShortcodeHandler[] = [
  {
    name: 'partner_dashboard',
    render: (attrs: ShortcodeAttributes) => (
      <PartnerDashboardWrapper
        tab={attrs.tab as string}
      />
    )
  },
  {
    name: 'supplier_dashboard',
    render: (attrs: ShortcodeAttributes) => (
      <SupplierDashboardWrapper
        period={attrs.period as string}
      />
    )
  }
];
