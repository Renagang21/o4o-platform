// Dropshipping Shortcodes Export
export { default as UserDashboard } from './UserDashboard';
export { default as RoleVerification } from './RoleVerification';

// Partner Shortcodes
export { 
  PartnerMainDashboard,
  PartnerProducts,
  PartnerCommissions,
  PartnerLinkGenerator,
  CommissionDashboard,
  PayoutRequests
} from './partner';

// Supplier Shortcodes
export {
  SupplierProducts,
  SupplierProductEditor
} from './supplier';

// Seller Shortcodes
export {
  SellerDashboard,
  SellerProducts,
  SellerSettlement
} from './seller';

// Import partner shortcodes
import { partnerShortcodes } from './partner';
// Import supplier shortcodes
import { supplierShortcodes } from './supplier';
// Import seller shortcodes  
import { sellerShortcodes } from './seller';

// Shortcode Registration Map
export const dropshippingShortcodes = {
  // Core dropshipping shortcodes
  'user_dashboard': {
    component: 'UserDashboard',
    description: 'User role-based dashboard for dropshipping platform',
    attributes: {
      role: {
        type: 'string',
        required: false,
        options: ['supplier', 'seller', 'affiliate'],
        description: 'Specific role dashboard to display'
      }
    }
  },
  'role_verification': {
    component: 'RoleVerification',
    description: 'Role verification form for dropshipping users',
    attributes: {
      type: {
        type: 'string',
        required: true,
        options: ['supplier', 'seller', 'affiliate'],
        description: 'Type of role to verify'
      }
    }
  },
  'profile_manager': {
    component: 'ProfileManager',
    description: 'Profile management for dropshipping users',
    attributes: {
      role: {
        type: 'string',
        required: false,
        description: 'User role for profile customization'
      }
    }
  },
  'role_switcher': {
    component: 'RoleSwitcher',
    description: 'Switch between multiple user roles',
    attributes: {}
  },
  // Partner shortcodes integration
  ...partnerShortcodes,
  // Supplier shortcodes integration
  ...supplierShortcodes,
  // Seller shortcodes integration
  ...sellerShortcodes
};