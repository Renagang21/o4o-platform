/**
 * Dashboard Statistics Hook
 * Integrates Admin Dashboard API with dashboard statistics
 *
 * WO-ADMIN-API-IMPLEMENT-P0: Uses real database queries
 */

import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';

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
        // Fetch data from real Admin Dashboard APIs (WO-ADMIN-API-IMPLEMENT-P0)
        const [salesResponse, orderStatusResponse, userGrowthResponse] = await Promise.all([
          authClient.api.get('/admin/dashboard/sales-summary?period=30d'),
          authClient.api.get('/admin/dashboard/order-status'),
          authClient.api.get('/admin/dashboard/user-growth?period=30d')
        ]);

        const salesData = salesResponse.data?.data;
        const orderStatusData = orderStatusResponse.data?.data || [];
        const userGrowthData = userGrowthResponse.data?.data;

        // Generate sales chart data (empty until daily breakdown is implemented)
        const today = new Date();
        const salesChartData = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
          salesChartData.push({
            date: date.toISOString().split('T')[0],
            amount: 0,
            orders: 0
          });
        }

        // Order status chart data from API
        const orderChartData = orderStatusData.map((item: { status: string; label: string; count: number; color: string }) => ({
          status: item.label,
          count: item.count,
          color: item.color
        }));

        // User growth chart data from API
        const userChartData = (userGrowthData?.growth || []).map((item: { date: string; newUsers: number }) => ({
          date: item.date ? new Date(item.date).toISOString().split('T')[0] : '',
          newUsers: item.newUsers,
          activeUsers: 0 // Active users per day not yet implemented
        }));

        // Fill in missing days for user chart
        if (userChartData.length < 7) {
          for (let i = 6; i >= userChartData.length; i--) {
            const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
            userChartData.unshift({
              date: date.toISOString().split('T')[0],
              newUsers: 0,
              activeUsers: 0
            });
          }
        }

        // Get pending order count from status data
        const pendingCount = orderStatusData.find((s: { status: string }) =>
          s.status === 'pending_payment' || s.status === 'created'
        )?.count || 0;

        return {
          ecommerce: {
            todaySales: 0, // Today's sales not yet implemented (requires daily breakdown)
            todayOrders: 0, // Today's orders not yet implemented
            totalProducts: 0, // Product count from cosmetics API
            lowStockProducts: 0, // Low stock not yet implemented
            pendingOrders: pendingCount,
            totalCustomers: userGrowthData?.totalUsers || 0,
            monthlyRevenue: salesData?.totalRevenue || 0,
            averageOrderValue: salesData?.averageOrderValue || 0
          },
          chartData: {
            sales: salesChartData,
            orders: orderChartData,
            users: userChartData.slice(-7)
          }
        };
      } catch (error: unknown) {
        // Return default data on error (empty state)
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