import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface MyAccountData {
  name: string;
  email: string;
  phone?: string;
  ordersCount: number;
  wishlistCount: number;
  memberSince: string;
  address?: {
    street: string;
    city: string;
    zipCode: string;
  };
}

export function useMyAccount() {
  return useQuery({
    queryKey: ['my-account'],
    queryFn: async () => {
      const response = await axios.get<MyAccountData>('/api/customer/account');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
