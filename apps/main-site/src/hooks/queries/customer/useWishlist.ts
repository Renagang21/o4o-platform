import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface WishlistItem {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  price: number;
  inStock: boolean;
  addedAt: string;
}

export interface WishlistData {
  items: WishlistItem[];
  total: number;
}

export function useWishlist() {
  return useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const response = await axios.get<WishlistData>('/api/customer/wishlist');
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
