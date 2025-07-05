import { useQuery, useMutation, useQueryClient } from 'react-query';
import { EcommerceApi } from '@/api/ecommerceApi';
import { Product, ProductFilters } from '@/types/ecommerce';
// import { toast } from 'react-hot-toast';
// 임시 toast 모킹 (react-hot-toast 미설치)
const toast = {
  success: (message: string) => console.log('SUCCESS:', message),
  error: (message: string) => console.error('ERROR:', message),
};

// 상품 목록 조회 훅
export const useProducts = (
  page = 1,
  limit = 20,
  filters: ProductFilters = {}
) => {
  return useQuery({
    queryKey: ['products', page, limit, filters],
    queryFn: () => EcommerceApi.getProducts(page, limit, filters),
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // 5분
  });
};

// 단일 상품 조회 훅
export const useProduct = (productId: string, enabled = true) => {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: () => EcommerceApi.getProduct(productId),
    enabled: !!productId && enabled,
    staleTime: 5 * 60 * 1000,
  });
};

// 상품 생성 훅
export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (productData: Partial<Product>) => 
      EcommerceApi.createProduct(productData),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      toast.success('상품이 성공적으로 생성되었습니다.');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '상품 생성에 실패했습니다.');
    },
  });
};

// 상품 수정 훅
export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ productId, productData }: { 
      productId: string; 
      productData: Partial<Product> 
    }) => EcommerceApi.updateProduct(productId, productData),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries(['products']);
      queryClient.invalidateQueries(['product', variables.productId]);
      toast.success('상품이 성공적으로 수정되었습니다.');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '상품 수정에 실패했습니다.');
    },
  });
};

// 상품 삭제 훅
export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (productId: string) => EcommerceApi.deleteProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      toast.success('상품이 성공적으로 삭제되었습니다.');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '상품 삭제에 실패했습니다.');
    },
  });
};

// 상품 복제 훅
export const useDuplicateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (productId: string) => EcommerceApi.duplicateProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      toast.success('상품이 성공적으로 복제되었습니다.');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '상품 복제에 실패했습니다.');
    },
  });
};