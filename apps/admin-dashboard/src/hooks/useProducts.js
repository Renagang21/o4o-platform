import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { EcommerceApi } from '@/api/ecommerceApi';
const toast = {
    success: (message) => console.log('SUCCESS:', message),
    error: (message) => console.error('ERROR:', message),
};
export const useProducts = (page = 1, limit = 20, filters = {}) => {
    return useQuery({
        queryKey: ['products', page, limit, filters],
        queryFn: () => EcommerceApi.getProducts(page, limit, filters),
        placeholderData: keepPreviousData,
        staleTime: 5 * 60 * 1000,
    });
};
export const useProduct = (productId, enabled = true) => {
    return useQuery({
        queryKey: ['product', productId],
        queryFn: () => EcommerceApi.getProduct(productId),
        enabled: !!productId && enabled,
        staleTime: 5 * 60 * 1000,
    });
};
export const useCreateProduct = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (productData) => EcommerceApi.createProduct(productData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('상품이 성공적으로 생성되었습니다.');
        },
        onError: (error) => {
            toast.error(error?.response?.data?.message || '상품 생성에 실패했습니다.');
        },
    });
};
export const useUpdateProduct = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ productId, productData }) => EcommerceApi.updateProduct(productId, productData),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['product', variables.productId] });
            toast.success('상품이 성공적으로 수정되었습니다.');
        },
        onError: (error) => {
            toast.error(error?.response?.data?.message || '상품 수정에 실패했습니다.');
        },
    });
};
export const useDeleteProduct = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (productId) => EcommerceApi.deleteProduct(productId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('상품이 성공적으로 삭제되었습니다.');
        },
        onError: (error) => {
            toast.error(error?.response?.data?.message || '상품 삭제에 실패했습니다.');
        },
    });
};
export const useDuplicateProduct = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (productId) => EcommerceApi.duplicateProduct(productId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('상품이 성공적으로 복제되었습니다.');
        },
        onError: (error) => {
            toast.error(error?.response?.data?.message || '상품 복제에 실패했습니다.');
        },
    });
};
//# sourceMappingURL=useProducts.js.map