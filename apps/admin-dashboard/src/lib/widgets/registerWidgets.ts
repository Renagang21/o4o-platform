/**
 * P1 Phase C: Widget Registration
 *
 * Registers all dashboard widgets with the registry.
 */

import { registerWidget, lazyWidget } from './widgetRegistry';
import type { StatWidgetData, TableWidgetData, ActionWidgetData, ChartWidgetData } from '@o4o/types';
import { apiClient } from '@/lib/api-client';

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
      const response = await apiClient.get('/admin/enrollments/stats');
      const { pendingCount, yesterdayPendingCount, delta } = response.data;

      const percentage = yesterdayPendingCount > 0
        ? (delta / yesterdayPendingCount) * 100
        : 0;

      return {
        value: pendingCount,
        label: '승인 대기 신청',
        change: {
          value: delta,
          percentage,
          direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral',
        },
        context: delta > 0 ? `어제보다 ${delta}건 증가` : delta < 0 ? `어제보다 ${Math.abs(delta)}건 감소` : '변동 없음',
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
      const response = await apiClient.get('/orders/today');
      const { count } = response.data;

      return {
        value: count,
        label: '오늘 주문',
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
      const response = await apiClient.get('/orders/stats');
      const stats = response.data;

      // Calculate month-to-date revenue
      const revenue = stats.totalRevenue || 0;
      const target = 15000000; // TODO: Get from settings

      return {
        value: revenue,
        label: '이번 달 매출',
        target,
        context: `목표 달성률 ${Math.round((revenue / target) * 100)}%`,
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
      const response = await apiClient.get('/products/low-stock', {
        params: { threshold: 10, limit: 0 }
      });
      const { count } = response.data;

      return {
        value: count,
        label: '재고 경고',
        context: `${count}개 상품 재고 부족`,
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
      const response = await apiClient.get('/admin/enrollments', {
        params: { limit: 5, page: 1, status: 'PENDING' }
      });
      const { items, pagination } = response.data;

      const rows = items.map((enrollment: any) => ({
        id: enrollment.id,
        name: enrollment.user?.name || '-',
        role: enrollment.role,
        status: enrollment.status,
        date: new Date(enrollment.submitted_at).toLocaleDateString('ko-KR'),
      }));

      return {
        rows,
        total: pagination.total,
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
      const response = await apiClient.get('/orders', {
        params: { status: 'pending', limit: 5, page: 1 }
      });
      const { data: orders, pagination } = response.data;

      const rows = (orders || []).map((order: any) => ({
        id: order.orderNumber,
        customer: order.buyerName || '-',
        amount: order.totalAmount,
        items: order.totalItems || 0,
        date: new Date(order.orderDate).toLocaleString('ko-KR'),
      }));

      return {
        rows,
        total: pagination?.total || 0,
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
      const response = await apiClient.get('/orders/series', {
        params: { metric: 'revenue', days: 7, currency: 'KRW' }
      });
      const { points } = response.data;

      return {
        type: 'line',
        data: points.map((p: any) => ({
          label: p.date.substring(5), // MM-DD format
          value: p.value
        })),
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
