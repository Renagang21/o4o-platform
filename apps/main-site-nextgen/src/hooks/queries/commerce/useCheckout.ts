import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface CheckoutData {
  items: {
    id: string;
    title: string;
    price: number;
    quantity: number;
    subtotal: number;
  }[];
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  availablePaymentMethods: {
    id: string;
    name: string;
    icon?: string;
  }[];
  shippingAddress?: {
    name: string;
    phone: string;
    address: string;
    city: string;
    zipCode: string;
  };
}

export function useCheckout() {
  return useQuery({
    queryKey: ['checkout'],
    queryFn: async () => {
      const response = await axios.get<CheckoutData>('/api/checkout');
      return response.data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}
