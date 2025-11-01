/**
 * Partner Shortcodes for Main Site
 * Partner dashboard and commission tracking shortcodes
 */

import React from 'react';
import { ShortcodeAttributes, ShortcodeHandler } from '@/utils/shortcodeParser';

// Lazy load the partner dashboard component
const PartnerDashboardLazy = React.lazy(() =>
  import('./PartnerDashboard').then(module => ({ default: module.PartnerDashboard }))
);

// Partner Dashboard Component with Suspense fallback
const PartnerDashboardWrapper: React.FC<{
  tab?: string;
}> = ({ tab = 'overview' }) => {
  return (
    <React.Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading partner dashboard...</p>
        </div>
      </div>
    }>
      <PartnerDashboardLazy defaultTab={tab} />
    </React.Suspense>
  );
};

// Partner shortcode handlers
export const partnerShortcodes: ShortcodeHandler[] = [
  {
    name: 'partner_dashboard',
    render: (attrs: ShortcodeAttributes) => (
      <PartnerDashboardWrapper
        tab={attrs.tab as string}
      />
    )
  }
];
