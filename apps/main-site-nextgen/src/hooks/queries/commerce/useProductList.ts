import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface Product {
  id: string;
  title: string;
  price: number;
  thumbnail: string;
  category?: string;
  description?: string;
}

export interface ProductListData {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export function useProductList(params?: {
  category?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: ['product-list', params],
    queryFn: async () => {
      const response = await axios.get<ProductListData>('/api/products', {
        params,
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
