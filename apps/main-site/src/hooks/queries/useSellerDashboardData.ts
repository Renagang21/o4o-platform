import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface SellerDashboardData {
  pending: number;
  available: number;
  incompleteCourses: number;
  ordersToday: number;
  revenue: number;
  activeProducts: number;
}

export function useSellerDashboardData() {
  return useQuery({
    queryKey: ['seller-dashboard'],
    queryFn: async () => {
      const response = await axios.get<SellerDashboardData>('/api/seller/dashboard');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
