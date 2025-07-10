import { OrderFilters, OrderStatus } from '@/types/ecommerce';
export declare const useOrders: (page?: number, limit?: number, filters?: OrderFilters) => import("@tanstack/react-query").UseQueryResult<import("../types").PaginatedResponse<import("@/types/ecommerce").Order>, Error>;
export declare const useOrder: (orderId: string, enabled?: boolean) => import("@tanstack/react-query").UseQueryResult<import("../types").ApiResponse<import("@/types/ecommerce").Order>, Error>;
export declare const useUpdateOrderStatus: () => import("@tanstack/react-query").UseMutationResult<import("../types").ApiResponse<import("@/types/ecommerce").Order>, any, {
    orderId: string;
    status: string;
    note?: string;
}, unknown>;
export declare const useRefundOrder: () => import("@tanstack/react-query").UseMutationResult<import("../types").ApiResponse<void>, any, {
    orderId: string;
    amount: number;
    reason?: string;
    items?: Array<{
        orderItemId: string;
        quantity: number;
        amount: number;
    }>;
}, unknown>;
export declare const useBulkOrderAction: () => import("@tanstack/react-query").UseMutationResult<import("../types").ApiResponse<void>, any, {
    action: "update_status" | "delete" | "export";
    orderIds: string[];
    data?: {
        status?: OrderStatus;
        note?: string;
    };
}, unknown>;
//# sourceMappingURL=useOrders.d.ts.map