import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Product, ProductFilters, ProductsResponse } from '@o4o/types';
import { api } from '@/lib/api';
import { useCartStore } from '@/stores/useCartStore';
import { useWishlistStore } from '@/stores/useWishlistStore';

// Fetch products with filters
export const useProducts = (filters?: ProductFilters) => {
  return useQuery<ProductsResponse>({
    queryKey: ['products', filters],
    queryFn: () => api.products.getProducts(filters)
  });
};

// Fetch single product
export const useProduct = (id: string) => {
  return useQuery<Product>({
    queryKey: ['product', id],
    queryFn: () => api.products.getProduct(id),
    enabled: !!id
  });
};

// Fetch product by slug
export const useProductBySlug = (slug: string) => {
  return useQuery<Product>({
    queryKey: ['product', 'slug', slug],
    queryFn: () => api.products.getProductBySlug(slug),
    enabled: !!slug
  });
};

// Add to cart
export const useAddToCart = () => {
  const addToCart = useCartStore(state => state.addToCart);
  
  return useMutation({
    mutationFn: async ({ product, quantity }: { product: Product; quantity: number }) => {
      await addToCart(product, quantity);
    }
  });
};

// Add to wishlist
export const useAddToWishlist = () => {
  const addToWishlist = useWishlistStore(state => state.addToWishlist);
  
  return useMutation({
    mutationFn: async (product: Product) => {
      await addToWishlist(product);
    }
  });
};

// Remove from wishlist
export const useRemoveFromWishlist = () => {
  const removeFromWishlist = useWishlistStore(state => state.removeFromWishlist);
  
  return useMutation({
    mutationFn: async (productId: string) => {
      await removeFromWishlist(productId);
    }
  });
};

// Get related products
export const useRelatedProducts = (productId: string, limit: number = 4) => {
  return useQuery<Product[]>({
    queryKey: ['related-products', productId, limit],
    queryFn: () => api.products.getRelatedProducts(productId, limit),
    enabled: !!productId
  });
};

// Search products
export const useSearchProducts = (query: string) => {
  return useQuery<Product[]>({
    queryKey: ['search-products', query],
    queryFn: () => api.products.searchProducts(query),
    enabled: query.length > 2
  });
};

// Get featured products
export const useFeaturedProducts = (limit: number = 8) => {
  return useQuery<Product[]>({
    queryKey: ['featured-products', limit],
    queryFn: () => api.products.getFeaturedProducts(limit)
  });
};

// Create product review
export const useCreateProductReview = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ productId, ...data }: { productId: string; rating: number; comment: string }) => {
      return api.products.createReview(productId, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['reviews', variables.productId] });
    }
  });
};