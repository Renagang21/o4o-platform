/**
 * General API Error Codes (SSOT)
 */
export declare const API_ERROR_CODES: {
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND";
    readonly USER_NOT_FOUND: "USER_NOT_FOUND";
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly INVALID_REQUEST: "INVALID_REQUEST";
    readonly MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD";
    readonly INVALID_FORMAT: "INVALID_FORMAT";
    readonly ALREADY_EXISTS: "ALREADY_EXISTS";
    readonly DUPLICATE_ENTRY: "DUPLICATE_ENTRY";
    readonly RATE_LIMITED: "RATE_LIMITED";
    readonly DATABASE_ERROR: "DATABASE_ERROR";
    readonly QUERY_FAILED: "QUERY_FAILED";
    readonly FILE_TOO_LARGE: "FILE_TOO_LARGE";
    readonly INVALID_FILE_TYPE: "INVALID_FILE_TYPE";
    readonly UPLOAD_FAILED: "UPLOAD_FAILED";
    readonly EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR";
    readonly PAYMENT_FAILED: "PAYMENT_FAILED";
    readonly EMAIL_SEND_FAILED: "EMAIL_SEND_FAILED";
};
export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
/**
 * HTTP Status Codes (for reference)
 */
export declare const HTTP_STATUS_CODES: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly NO_CONTENT: 204;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly UNPROCESSABLE_ENTITY: 422;
    readonly TOO_MANY_REQUESTS: 429;
    readonly INTERNAL_SERVER_ERROR: 500;
    readonly SERVICE_UNAVAILABLE: 503;
};
export type HttpStatusCode = (typeof HTTP_STATUS_CODES)[keyof typeof HTTP_STATUS_CODES];
/**
 * Standard API Success Response
 */
export interface ApiResponse<T = unknown> {
    success: true;
    data: T;
    message?: string;
}
/**
 * Standard API Error Response
 */
export interface ApiErrorResponse {
    success: false;
    error: string;
    code?: string;
    details?: unknown;
}
/**
 * Union type for any API response
 */
export type ApiResult<T = unknown> = ApiResponse<T> | ApiErrorResponse;
/**
 * Legacy ApiError interface (deprecated, use ApiErrorResponse)
 * @deprecated Use ApiErrorResponse instead
 */
export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}
export interface PaginationParams {
    page?: number;
    pageSize?: number;
    sort?: string;
    order?: 'asc' | 'desc';
}
/**
 * Paginated API Response
 */
export interface PaginatedApiResponse<T> {
    success: true;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    currentPage?: number;
    pageSize?: number;
    totalItems?: number;
}
export interface ApiRequestConfig {
    headers?: Record<string, string>;
    params?: Record<string, string | number | boolean>;
    timeout?: number;
}
export interface LoginPayload {
    email: string;
    password: string;
}
export interface RegisterPayload {
    email: string;
    password: string;
    name: string;
    role?: 'customer' | 'business' | 'affiliate' | 'partner';
}
export interface UpdateProfilePayload {
    name?: string;
    avatar?: string;
    phone?: string;
    address?: string;
}
export interface CreateProductPayload {
    name: string;
    description: string;
    price: number;
    discountPrice?: number;
    images: string[];
    categoryId: string;
    tags?: string[];
    stock: number;
}
export interface UpdateProductPayload extends Partial<CreateProductPayload> {
    isActive?: boolean;
}
export interface CreateOrderPayload {
    items: Array<{
        productId: string;
        quantity: number;
    }>;
    shippingAddress: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    paymentMethod: string;
}
export interface ApiReview {
    id: string;
    productId: string;
    userId: string;
    userName?: string;
    rating: number;
    comment: string;
    images?: string[];
    isVerifiedPurchase: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateReviewPayload {
    productId: string;
    rating: number;
    comment: string;
    images?: string[];
}
export interface Payment {
    id: string;
    orderId: string;
    amount: number;
    method: 'card' | 'bank_transfer' | 'paypal' | 'kakao_pay';
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    transactionId?: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
export interface ApiProductFilters {
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    tags?: string[];
    isActive?: boolean;
    sellerId?: string;
    search?: string;
}
export interface ApiOrderFilters {
    status?: string;
    paymentStatus?: string;
    dateFrom?: Date;
    dateTo?: Date;
    userId?: string;
}
export type SortOption = 'createdAt' | '-createdAt' | 'price' | '-price' | 'name' | '-name' | 'popularity' | '-popularity';
//# sourceMappingURL=api.d.ts.map