import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorProductApi } from '../../api/vendor';
import { toast } from 'sonner';

interface ProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
}

// 상품 목록 조회
export function useVendorProducts(params: ProductsParams = {}) {
  return useQuery({
    queryKey: ['vendor', 'products', params],
    queryFn: async () => {
      const response = await vendorProductApi.getProducts(params);
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5분
  });
}

// 상품 상세 조회
export function useVendorProduct(id: string) {
  return useQuery({
    queryKey: ['vendor', 'products', id],
    queryFn: async () => {
      const response = await vendorProductApi.getProduct(id);
      return response.data;
    },
    enabled: !!id,
  });
}

// 카테고리 목록 조회
export function useProductCategories() {
  return useQuery({
    queryKey: ['vendor', 'product-categories'],
    queryFn: async () => {
      const response = await vendorProductApi.getCategories();
      return response.data;
    },
    staleTime: 1000 * 60 * 30, // 30분
  });
}

// 상품 생성
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => vendorProductApi.createProduct(data) as Promise<any>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'products'] });
      toast.success('상품이 성공적으로 등록되었습니다.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || '상품 등록에 실패했습니다.');
    },
  });
}

// 상품 수정
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      vendorProductApi.updateProduct(id, data) as Promise<any>,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'products', variables.id] });
      toast.success('상품이 성공적으로 수정되었습니다.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || '상품 수정에 실패했습니다.');
    },
  });
}

// 상품 삭제
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => vendorProductApi.deleteProduct(id) as Promise<any>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'products'] });
      toast.success('상품이 삭제되었습니다.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || '상품 삭제에 실패했습니다.');
    },
  });
}