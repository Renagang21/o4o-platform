import { useQuery } from '@tanstack/react-query';
import { vendorStatsApi } from '../../api/vendor';

// 대시보드 통계
export function useVendorDashboardStats() {
  return useQuery({
    queryKey: ['vendor', 'dashboard-stats'],
    queryFn: async () => {
      const response = await vendorStatsApi.getDashboardStats();
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5분
    refetchInterval: 1000 * 60 * 5, // 5분마다 자동 갱신
  });
}

// 매출 차트 데이터
export function useVendorSalesChart(period: '7d' | '30d' | '90d' = '7d') {
  return useQuery({
    queryKey: ['vendor', 'sales-chart', period],
    queryFn: async () => {
      const response = await vendorStatsApi.getSalesChartData(period);
      return response.data;
    },
    staleTime: 1000 * 60 * 10, // 10분
  });
}

// 최근 주문
export function useVendorRecentOrders(limit: number = 5) {
  return useQuery({
    queryKey: ['vendor', 'recent-orders', limit],
    queryFn: async () => {
      const response = await vendorStatsApi.getRecentOrders(limit);
      return response.data;
    },
    staleTime: 1000 * 60 * 2, // 2분
    refetchInterval: 1000 * 60 * 2, // 2분마다 자동 갱신
  });
}

// 인기 상품
export function useVendorTopProducts() {
  return useQuery({
    queryKey: ['vendor', 'top-products'],
    queryFn: async () => {
      const response = await vendorStatsApi.getTopProducts();
      return response.data;
    },
    staleTime: 1000 * 60 * 10, // 10분
  });
}