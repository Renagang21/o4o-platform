/**
 * P1 Phase C: Admin Dashboard Page Wrapper
 *
 * Wrapper component that connects AdminDashboardPage to auth store
 */

import { FC } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { AdminDashboardPage } from './AdminDashboardPage';

/**
 * Admin Dashboard Page Wrapper
 *
 * Fetches user capabilities from auth store and passes to AdminDashboardPage
 */
export const AdminDashboardPageWrapper: FC = () => {
  const user = useAuthStore((state) => state.user);

  // Get capabilities from user permissions
  // In P1, we're using permissions as capabilities
  const capabilities = user?.permissions || [];

  return <AdminDashboardPage capabilities={capabilities} />;
};

export default AdminDashboardPageWrapper;
