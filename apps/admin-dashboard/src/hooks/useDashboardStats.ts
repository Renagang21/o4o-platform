/**
 * Dashboard Statistics Hook
 * Integrates E-commerce API with dashboard statistics
 */

import { useQuery } from '@tanstack/react-query';
// import { EcommerceApi } from '@/api/ecommerceApi';
// import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface DashboardSummary {
  ecommerce: {
    todaySales: number;
    todayOrders: number;
    totalProducts: number;
    lowStockProducts: number;
    pendingOrders: number;
    totalCustomers: number;
    monthlyRevenue: number;
    averageOrderValue: number;
  };
  chartData: {
    sales: Array<{
      date: string;
      amount: number;
      orders: number;
    }>;
    orders: Array<{
      status: string;
      count: number;
      color: string;
    }>;
    users: Array<{
      date: string;
      newUsers: number;
      activeUsers: number;
    }>;
  };
}

export const useDashboardStats = () => {
  return useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'stats', 'summary'],
    queryFn: async () => {
      try {
        // Fetch dashboard stats
        // const dashboardStats = await EcommerceApi.getDashboardStats();

        // Fetch sales report for the month
        // const salesReport = await EcommerceApi.getSalesReport(
        //   'custom',
        //   '/* date removed */',
        //   '/* date removed */'
        // );

        // Fetch recent orders for status distribution
        // const ordersResponse = await EcommerceApi.getOrders(1, 100);
        // const orders = ordersResponse.data || [];
        const dashboardStats = { data: null };
        const salesReport = { data: null };
        const orders: any[] = [];

        // Calculate order status distribution
        const statusCounts: Record<string, number> = {
          pending: 0,
          processing: 0,
          shipped: 0,
          completed: 0,
          cancelled: 0,
          refunded: 0
        };

        orders.forEach((order: { status: string }) => {
          if (statusCounts[order.status] !== undefined) {
            statusCounts[order.status]++;
          }
        });

        // Process sales data for chart (last 30 days)
        const salesChartData = [];
        const today = new Date();

        for (let i = 29; i >= 0; i--) {
          const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
          const dayData = salesReport.data?.salesByDay?.find(
            (d: { date: string; sales: number; orders: number }) => d.date === date.toISOString().split('T')[0]
          );

          salesChartData.push({
            date: date.toISOString().split('T')[0],
            amount: dayData?.sales || 0,
            orders: dayData?.orders || 0
          });
        }

        // Order status chart data
        const orderStatusData = [
          { status: '대기중', count: statusCounts.pending, color: '#f59e0b' },
          { status: '처리중', count: statusCounts.processing, color: '#3b82f6' },
          { status: '배송중', count: statusCounts.shipped, color: '#8b5cf6' },
          { status: '완료', count: statusCounts.completed, color: '#10b981' },
          { status: '취소', count: statusCounts.cancelled, color: '#ef4444' },
          { status: '환불', count: statusCounts.refunded, color: '#f97316' }
        ].filter((item) => item.count > 0);

        // Generate user activity data (empty until API integration)
        const userChartData = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
          userChartData.push({
            date: date.toISOString().split('T')[0],
            newUsers: 0,
            activeUsers: 0
          });
        }

        // Calculate monthly revenue
        const monthlyRevenue = salesReport.data?.totalSales || 
          (dashboardStats.data?.todaySales || 0) * 30;

        // Calculate average order value
        const avgOrderValue = dashboardStats.data?.todaySales && dashboardStats.data?.todayOrders
          ? dashboardStats.data.todaySales / dashboardStats.data.todayOrders
          : 0;

        return {
          ecommerce: {
            todaySales: dashboardStats.data?.todaySales || 0,
            todayOrders: dashboardStats.data?.todayOrders || 0,
            totalProducts: dashboardStats.data?.totalProducts || 0,
            lowStockProducts: dashboardStats.data?.lowStockProducts || 0,
            pendingOrders: dashboardStats.data?.pendingOrders || 0,
            totalCustomers: dashboardStats.data?.totalCustomers || 0,
            monthlyRevenue,
            averageOrderValue: avgOrderValue
          },
          chartData: {
            sales: salesChartData,
            orders: orderStatusData,
            users: userChartData
          }
        };
      } catch (error: unknown) {
    // Error logging - use proper error handler
        
        // Return default data on error
        return generateDefaultDashboardData();
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refresh every minute
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
};

// Generate default empty dashboard data (no mock values)
function generateDefaultDashboardData(): DashboardSummary {
  const today = new Date();
  const salesData = [];

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    salesData.push({
      date: date.toISOString().split('T')[0],
      amount: 0,
      orders: 0
    });
  }

  const userData = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    userData.push({
      date: date.toISOString().split('T')[0],
      newUsers: 0,
      activeUsers: 0
    });
  }

  return {
    ecommerce: {
      todaySales: 0,
      todayOrders: 0,
      totalProducts: 0,
      lowStockProducts: 0,
      pendingOrders: 0,
      totalCustomers: 0,
      monthlyRevenue: 0,
      averageOrderValue: 0
    },
    chartData: {
      sales: salesData,
      orders: [],
      users: userData
    }
  };
}