import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface CartItem {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface CartData {
  items: CartItem[];
  total: number;
  itemCount: number;
  shipping: number;
  discount: number;
  finalTotal: number;
}

export function useCart() {
  return useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const response = await axios.get<CartData>('/api/cart');
      return response.data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}
