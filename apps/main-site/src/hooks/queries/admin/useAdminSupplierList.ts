import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface Supplier {
  id: string;
  name: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  productsCount: number;
  ordersCount: number;
  joinedAt: string;
}

export interface AdminSupplierListData {
  items: Supplier[];
  total: number;
  page: number;
  pageSize: number;
}

export function useAdminSupplierList(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
}) {
  return useQuery({
    queryKey: ['admin-supplier-list', params],
    queryFn: async () => {
      const response = await axios.get<AdminSupplierListData>('/api/admin/suppliers', {
        params,
      });
      return response.data;
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}
