/**
 * P1 Phase C: Default Dashboard Layouts
 *
 * Default widget configurations for each role.
 */

import type { DashboardLayout } from '@o4o/types';

/**
 * Supplier Dashboard Layout
 */
export const supplierDefaultLayout: DashboardLayout = {
  id: 'supplier-default',
  role: 'supplier',
  widgetIds: [
    'stat-low-stock-alerts',
    'stat-new-orders',
    'stat-product-approval-status',
    'stat-monthly-revenue',
    'table-pending-orders',
    'action-quick-actions',
  ],
  hiddenWidgetIds: [],
  gridConfig: {
    columns: 3,
    gap: 6,
  },
};

/**
 * Seller Dashboard Layout
 */
export const sellerDefaultLayout: DashboardLayout = {
  id: 'seller-default',
  role: 'seller',
  widgetIds: [
    'stat-today-sales',
    'stat-weekly-revenue',
    'stat-pending-orders',
    'stat-top-products',
    'table-recent-orders',
    'chart-sales-trend',
    'action-quick-actions',
  ],
  hiddenWidgetIds: [],
  gridConfig: {
    columns: 3,
    gap: 6,
  },
};

/**
 * Partner Dashboard Layout
 */
export const partnerDefaultLayout: DashboardLayout = {
  id: 'partner-default',
  role: 'partner',
  widgetIds: [
    'stat-referral-clicks',
    'stat-conversions',
    'stat-estimated-commission',
    'stat-top-campaigns',
    'table-recent-referrals',
    'chart-click-trend',
    'action-quick-actions',
  ],
  hiddenWidgetIds: [],
  gridConfig: {
    columns: 3,
    gap: 6,
  },
};
