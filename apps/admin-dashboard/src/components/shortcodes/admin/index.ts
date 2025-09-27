// Admin-specific shortcode components
export { default as AdminApprovalQueue } from './ApprovalQueue';
export { default as AdminPlatformStats } from './PlatformStats';

// Re-export for convenience
import AdminApprovalQueue from './ApprovalQueue';
import AdminPlatformStats from './PlatformStats';

export const adminShortcodes = {
  'admin_approval_queue': AdminApprovalQueue,
  'admin_platform_stats': AdminPlatformStats,
};

export default {
  AdminApprovalQueue,
  AdminPlatformStats,
};