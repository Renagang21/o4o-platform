/**
 * P1 Phase C: Widget Registration
 *
 * Registers all dashboard widgets with the registry.
 */

import { registerWidget, lazyWidget } from './widgetRegistry';
import type { StatWidgetData, TableWidgetData, ActionWidgetData, ChartWidgetData } from '@o4o/types';

/**
 * Register all widgets
 *
 * Call this function on app initialization
 */
export function registerAllWidgets() {
  // ==================== STAT WIDGETS ====================

  // Pending Enrollments (Admin)
  registerWidget(
    {
      id: 'stat-pending-enrollments',
      type: 'stat',
      title: '승인 대기 신청',
      description: '검토가 필요한 신청',
      requiredCapabilities: ['enrollment.read', 'admin.all'],
      size: 'small',
      priority: 'critical',
      refreshInterval: 60,
      metadata: { roles: ['admin'] },
    },
    lazyWidget(() => import('@/components/widgets/stats/PendingEnrollmentsWidget')),
    async (): Promise<StatWidgetData> => {
      // TODO: Replace with actual API call
      return {
        value: 12,
        label: '승인 대기 신청',
        change: {
          value: 3,
          percentage: 33.3,
          direction: 'up',
        },
        context: '어제보다 3건 증가',
        format: 'number',
      };
    }
  );

  // Today Orders
  registerWidget(
    {
      id: 'stat-today-orders',
      type: 'stat',
      title: '오늘 주문',
      description: '오늘 접수된 주문',
      requiredCapabilities: ['order.view'],
      size: 'small',
      priority: 'high',
      refreshInterval: 300,
      metadata: { roles: ['admin', 'seller', 'supplier'] },
    },
    lazyWidget(() => import('@/components/widgets/stats/TodayOrdersWidget')),
    async (): Promise<StatWidgetData> => {
      // TODO: Replace with actual API call
      return {
        value: 47,
        label: '오늘 주문',
        change: {
          value: -5,
          percentage: -9.6,
          direction: 'down',
        },
        context: '어제보다 5건 감소',
        format: 'number',
      };
    }
  );

  // Monthly Revenue
  registerWidget(
    {
      id: 'stat-monthly-revenue',
      type: 'stat',
      title: '이번 달 매출',
      description: '누적 매출액',
      requiredCapabilities: ['order.view'],
      size: 'small',
      priority: 'high',
      refreshInterval: 300,
      metadata: { roles: ['admin', 'seller', 'supplier'] },
    },
    lazyWidget(() => import('@/components/widgets/stats/MonthlyRevenueWidget')),
    async (): Promise<StatWidgetData> => {
      // TODO: Replace with actual API call
      return {
        value: 12500000,
        label: '이번 달 매출',
        change: {
          value: 1500000,
          percentage: 13.6,
          direction: 'up',
        },
        target: 15000000,
        context: '목표 달성률 83%',
        format: 'currency',
      };
    }
  );

  // Low Stock Alerts (Supplier)
  registerWidget(
    {
      id: 'stat-low-stock-alerts',
      type: 'stat',
      title: '재고 경고',
      description: '재고 부족 상품',
      requiredCapabilities: ['product.read'],
      size: 'small',
      priority: 'critical',
      refreshInterval: 600,
      metadata: { roles: ['supplier'] },
    },
    lazyWidget(() => import('@/components/widgets/stats/LowStockWidget')),
    async (): Promise<StatWidgetData> => {
      // TODO: Replace with actual API call
      return {
        value: 8,
        label: '재고 경고',
        context: '8개 상품 재고 부족',
        format: 'number',
      };
    }
  );

  // ==================== TABLE WIDGETS ====================

  // Recent Enrollments (Admin)
  registerWidget(
    {
      id: 'table-recent-enrollments',
      type: 'table',
      title: '최근 신청',
      description: '최근 5건',
      requiredCapabilities: ['enrollment.read'],
      size: 'large',
      priority: 'high',
      refreshInterval: 60,
      metadata: { roles: ['admin'] },
    },
    lazyWidget(() => import('@/components/widgets/tables/RecentEnrollmentsWidget')),
    async (): Promise<TableWidgetData> => {
      // TODO: Replace with actual API call
      return {
        rows: [
          { id: '1', name: '홍길동', role: '공급자', status: 'PENDING', date: '2025-11-09' },
          { id: '2', name: '김철수', role: '판매자', status: 'PENDING', date: '2025-11-09' },
          { id: '3', name: '이영희', role: '파트너', status: 'ON_HOLD', date: '2025-11-08' },
        ],
        total: 12,
        columns: [
          { key: 'name', label: '이름', width: '25%' },
          { key: 'role', label: '역할', width: '20%' },
          { key: 'status', label: '상태', width: '20%' },
          { key: 'date', label: '신청일', width: '25%' },
        ],
        emptyMessage: '신청 내역이 없습니다',
      };
    }
  );

  // Pending Orders
  registerWidget(
    {
      id: 'table-pending-orders',
      type: 'table',
      title: '미처리 주문',
      description: '처리 필요',
      requiredCapabilities: ['order.view'],
      size: 'large',
      priority: 'high',
      refreshInterval: 300,
      metadata: { roles: ['admin', 'seller', 'supplier'] },
    },
    lazyWidget(() => import('@/components/widgets/tables/PendingOrdersWidget')),
    async (): Promise<TableWidgetData> => {
      // TODO: Replace with actual API call
      return {
        rows: [
          { id: '#1234', customer: '홍길동', amount: 45000, items: 3, date: '2025-11-09 14:23' },
          { id: '#1235', customer: '김철수', amount: 120000, items: 5, date: '2025-11-09 13:45' },
        ],
        total: 5,
        columns: [
          { key: 'id', label: '주문번호', width: '20%' },
          { key: 'customer', label: '고객', width: '25%' },
          { key: 'amount', label: '금액', width: '20%', align: 'right', format: (val) => `${val.toLocaleString()}원` },
          { key: 'items', label: '수량', width: '15%', align: 'center' },
          { key: 'date', label: '주문일시', width: '20%' },
        ],
        emptyMessage: '미처리 주문이 없습니다',
      };
    }
  );

  // ==================== CHART WIDGETS ====================

  // Sales Trend Chart
  registerWidget(
    {
      id: 'chart-sales-trend',
      type: 'chart',
      title: '7일 매출 추이',
      description: '최근 7일',
      requiredCapabilities: ['order.view'],
      size: 'large',
      priority: 'normal',
      refreshInterval: 600,
      metadata: { roles: ['admin', 'seller'] },
    },
    lazyWidget(() => import('@/components/widgets/charts/SalesTrendWidget')),
    async (): Promise<ChartWidgetData> => {
      // TODO: Replace with actual API call
      return {
        type: 'line',
        data: [
          { label: '11/03', value: 850000 },
          { label: '11/04', value: 920000 },
          { label: '11/05', value: 780000 },
          { label: '11/06', value: 1100000 },
          { label: '11/07', value: 950000 },
          { label: '11/08', value: 1250000 },
          { label: '11/09', value: 1100000 },
        ],
        xAxisLabel: '날짜',
        yAxisLabel: '매출 (원)',
        colors: ['#3b82f6'],
      };
    }
  );

  // ==================== ACTION WIDGETS ====================

  // Quick Actions (Admin)
  registerWidget(
    {
      id: 'action-quick-actions',
      type: 'action',
      title: '빠른 작업',
      requiredCapabilities: [],
      size: 'medium',
      priority: 'normal',
      metadata: { roles: ['admin', 'seller', 'supplier', 'partner'] },
    },
    lazyWidget(() => import('@/components/widgets/actions/QuickActionsWidget')),
    async (): Promise<ActionWidgetData> => {
      // TODO: Replace with actual API call
      return {
        actions: [
          {
            id: 'new-product',
            label: '신규 상품 등록',
            icon: 'Plus',
            href: '/products/new',
            variant: 'primary',
          },
          {
            id: 'view-orders',
            label: '주문 관리',
            icon: 'ShoppingBag',
            href: '/orders',
            variant: 'secondary',
          },
        ],
      };
    }
  );
}
