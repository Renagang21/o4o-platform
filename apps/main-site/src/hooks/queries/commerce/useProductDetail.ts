import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface ProductDetail {
  id: string;
  title: string;
  price: number;
  description: string;
  image: string;
  images?: string[];
  category: string;
  stock: number;
  specifications?: Record<string, string>;
  reviews?: {
    rating: number;
    count: number;
  };
}

export function useProductDetail(productId: string) {
  return useQuery({
    queryKey: ['product-detail', productId],
    queryFn: async () => {
      const response = await axios.get<ProductDetail>(`/api/products/${productId}`);
      return response.data;
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
