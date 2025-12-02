import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface SupplierDashboardData {
  pendingOrders: number;
  activeProducts: number;
  monthlyRevenue: number;
  lowStockItems: number;
  newRequests: number;
}

export function useSupplierDashboardData() {
  return useQuery({
    queryKey: ['supplier-dashboard'],
    queryFn: async () => {
      const response = await axios.get<SupplierDashboardData>('/api/supplier/dashboard');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
