import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface AdminStatsData {
  users: number;
  products: number;
  ordersToday: number;
  revenue: number;
  sellers: number;
  suppliers: number;
  partners: number;
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await axios.get<AdminStatsData>('/api/admin/stats');
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
