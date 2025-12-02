import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface SellerDetail {
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
  revenue: number;
  joinedAt: string;
  lastActive: string;
  notes?: string;
}

export function useAdminSellerDetail(sellerId: string) {
  return useQuery({
    queryKey: ['admin-seller-detail', sellerId],
    queryFn: async () => {
      const response = await axios.get<SellerDetail>(`/api/admin/sellers/${sellerId}`);
      return response.data;
    },
    enabled: !!sellerId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}
