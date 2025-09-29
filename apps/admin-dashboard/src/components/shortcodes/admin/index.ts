// Admin-specific shortcode components
export { default as AdminApprovalQueue } from './ApprovalQueue';
// PlatformStats disabled - requires recharts package
// export { default as AdminPlatformStats } from './PlatformStats';

// Re-export for convenience
import AdminApprovalQueue from './ApprovalQueue';
// import AdminPlatformStats from './PlatformStats';

// Placeholder component for PlatformStats
const AdminPlatformStats = () => null;

export const adminShortcodes = {
  'admin_approval_queue': AdminApprovalQueue,
  'admin_platform_stats': AdminPlatformStats, // Disabled - requires recharts
};

export default {
  AdminApprovalQueue,
  AdminPlatformStats, // Disabled - requires recharts
};