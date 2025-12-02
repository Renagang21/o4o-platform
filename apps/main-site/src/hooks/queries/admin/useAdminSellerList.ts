import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface Seller {
  id: string;
  name: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  productsCount: number;
  ordersCount: number;
  revenue: number;
  joinedAt: string;
}

export interface AdminSellerListData {
  items: Seller[];
  total: number;
  page: number;
  pageSize: number;
}

export function useAdminSellerList(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
}) {
  return useQuery({
    queryKey: ['admin-seller-list', params],
    queryFn: async () => {
      const response = await axios.get<AdminSellerListData>('/api/admin/sellers', {
        params,
      });
      return response.data;
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}
