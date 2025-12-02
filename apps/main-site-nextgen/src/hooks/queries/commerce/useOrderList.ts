import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  itemCount: number;
  thumbnail?: string;
}

export interface OrderListData {
  orders: Order[];
  total: number;
  page: number;
  pageSize: number;
}

export function useOrderList(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
}) {
  return useQuery({
    queryKey: ['order-list', params],
    queryFn: async () => {
      const response = await axios.get<OrderListData>('/api/orders', {
        params,
      });
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
