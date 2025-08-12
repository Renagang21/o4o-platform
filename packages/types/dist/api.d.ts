export interface ApiResponse<T = unknown> {
    data: T;
    success: boolean;
    message?: string;
}
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
export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
    pagination: {
        currentPage: number;
        pageSize: number;
        totalItems: number;
        totalPages: number;
    };
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
    role?: 'customer' | 'business' | 'affiliate';
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