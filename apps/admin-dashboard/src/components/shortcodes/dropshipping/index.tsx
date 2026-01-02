/**
 * Dropshipping Shortcodes Index - Admin Dashboard
 * Unified array format for auto-discovery
 */

import React from 'react';
import { ShortcodeDefinition } from '@o4o/shortcodes';

// Export all components
export { default as UserDashboard } from './UserDashboard';
export { default as RoleVerification } from './RoleVerification';

// Partner Shortcodes
export {
  PartnerDashboard,
  PartnerMainDashboard, // Deprecated: use PartnerDashboard instead
  PartnerProducts,
  PartnerCommissions,
  PartnerLinkGenerator,
  PartnerCommissionDashboard,
  PayoutRequests
} from './partner';

// Supplier Shortcodes
export {
  SupplierProducts,
  SupplierProductEditor
} from './supplier';

// Seller Shortcodes - H4-0: Components removed (stub backend deleted)
// export { SellerDashboard, SellerProducts, SellerSettlement } from './seller';

// Import shortcode arrays
import { partnerShortcodes } from './partner';
import { supplierShortcodes } from './supplier';
import { sellerShortcodes } from './seller';

// Lazy imports for core components
const UserDashboardLazy = React.lazy(() => import('./UserDashboard'));
const RoleVerificationLazy = React.lazy(() => import('./RoleVerification'));

// Loading component
const Loading = () => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

// Core dropshipping shortcodes
const coreShortcodes: ShortcodeDefinition[] = [
  {
    name: 'user_dashboard',
    component: ({ attributes }) => (
      <React.Suspense fallback={<Loading />}>
        <UserDashboardLazy {...attributes} />
      </React.Suspense>
    ),
    description: 'User role-based dashboard for dropshipping platform'
  },
  {
    name: 'role_verification',
    component: ({ attributes }) => (
      <React.Suspense fallback={<Loading />}>
        <RoleVerificationLazy {...attributes} />
      </React.Suspense>
    ),
    description: 'Role verification form for dropshipping users'
  },
  {
    name: 'profile_manager',
    component: () => (
      <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
        <p className="text-yellow-800">Profile Manager - Coming Soon</p>
      </div>
    ),
    description: 'Profile management for dropshipping users'
  },
  {
    name: 'role_switcher',
    component: () => (
      <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
        <p className="text-yellow-800">Role Switcher - Coming Soon</p>
      </div>
    ),
    description: 'Switch between multiple user roles'
  }
];

/**
 * All dropshipping shortcodes - Combined array
 * This format is compatible with the auto-registration system
 */
export const dropshippingShortcodes: ShortcodeDefinition[] = [
  ...coreShortcodes,
  ...partnerShortcodes,
  ...supplierShortcodes,
  ...sellerShortcodes
];
