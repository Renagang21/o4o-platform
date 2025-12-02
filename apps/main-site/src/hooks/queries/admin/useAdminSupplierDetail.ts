import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface SupplierDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  businessInfo: {
    name: string;
    registration: string;
    address: string;
  };
  productsCount: number;
  ordersCount: number;
  joinedAt: string;
  lastActive: string;
  notes?: string;
}

export function useAdminSupplierDetail(supplierId: string) {
  return useQuery({
    queryKey: ['admin-supplier-detail', supplierId],
    queryFn: async () => {
      const response = await axios.get<SupplierDetail>(`/api/admin/suppliers/${supplierId}`);
      return response.data;
    },
    enabled: !!supplierId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}
