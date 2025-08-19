// Dropshipping Shortcodes Export
export { default as UserDashboard } from './UserDashboard';
export { default as RoleVerification } from './RoleVerification';

// Shortcode Registration Map
export const dropshippingShortcodes = {
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
  }
};