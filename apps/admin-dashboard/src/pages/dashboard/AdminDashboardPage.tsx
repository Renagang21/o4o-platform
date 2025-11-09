/**
 * P1 Phase C: Admin Dashboard Page
 *
 * Dashboard for admin role with enrollment management and system overview widgets.
 */

import { FC } from 'react';
import { RoleDashboard } from './RoleDashboard';
import type { DashboardLayout } from '@o4o/types';

// Default layout for admin dashboard
const adminDefaultLayout: DashboardLayout = {
  id: 'admin-default',
  role: 'admin',
  widgetIds: [
    'stat-pending-enrollments',
    'stat-today-processed',
    'stat-total-users',
    'stat-system-health',
    'table-recent-enrollments',
    'action-quick-actions',
    'chart-enrollment-trend',
  ],
  hiddenWidgetIds: [],
  gridConfig: {
    columns: 3,
    gap: 6,
  },
};

export interface AdminDashboardPageProps {
  /** User's capabilities */
  capabilities: string[];
}

/**
 * Admin Dashboard Page
 */
export const AdminDashboardPage: FC<AdminDashboardPageProps> = ({ capabilities }) => {
  return (
    <RoleDashboard
      role="admin"
      capabilities={capabilities}
      defaultLayout={adminDefaultLayout}
      title="관리자 대시보드"
      description="시스템 현황과 신청 관리를 한눈에 확인하세요"
    />
  );
};

export default AdminDashboardPage;
