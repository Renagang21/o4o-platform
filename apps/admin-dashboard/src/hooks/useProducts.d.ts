import { Product, ProductFilters } from '@/types/ecommerce';
export declare const useProducts: (page?: number, limit?: number, filters?: ProductFilters) => import("@tanstack/react-query").UseQueryResult<import("../types").PaginatedResponse<Product>, Error>;
export declare const useProduct: (productId: string, enabled?: boolean) => import("@tanstack/react-query").UseQueryResult<import("../types").ApiResponse<Product>, Error>;
export declare const useCreateProduct: () => import("@tanstack/react-query").UseMutationResult<import("../types").ApiResponse<Product>, any, Partial<Product>, unknown>;
export declare const useUpdateProduct: () => import("@tanstack/react-query").UseMutationResult<import("../types").ApiResponse<Product>, any, {
    productId: string;
    productData: Partial<Product>;
}, unknown>;
export declare const useDeleteProduct: () => import("@tanstack/react-query").UseMutationResult<import("../types").ApiResponse<void>, any, string, unknown>;
export declare const useDuplicateProduct: () => import("@tanstack/react-query").UseMutationResult<import("../types").ApiResponse<Product>, any, string, unknown>;
//# sourceMappingURL=useProducts.d.ts.map