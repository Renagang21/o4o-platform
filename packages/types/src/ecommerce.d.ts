import type { User, UserRole } from './auth.js';
export type ProductStatus = 'draft' | 'pending' | 'approved' | 'active' | 'inactive' | 'out_of_stock' | 'discontinued';
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentMethod = 'card' | 'transfer' | 'virtual_account' | 'kakao_pay' | 'naver_pay' | 'paypal' | 'cash_on_delivery';
export type RetailerGrade = 'gold' | 'premium' | 'vip';
export interface CategoryGroup {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}
export interface Category {
    id: string;
    groupId: string;
    parentId?: string;
    name: string;
    slug: string;
    description?: string;
    level: number;
    sortOrder: number;
    isActive: boolean;
    imageUrl?: string;
    seo?: {
        metaTitle?: string;
        metaDescription?: string;
        keywords?: string[];
    };
    createdAt: string;
    updatedAt: string;
    children?: Category[];
}
export interface ProductTag {
    id: string;
    name: string;
    slug: string;
    color?: string;
    createdAt: string;
}
export interface PriceByRole {
    customer: number;
    business: number;
    affiliate: number;
    retailer: {
        gold: number;
        premium: number;
        vip: number;
    };
}
export interface InventoryInfo {
    stockQuantity: number;
    minOrderQuantity: number;
    maxOrderQuantity?: number;
    lowStockThreshold: number;
    manageStock: boolean;
    allowBackorder: boolean;
    stockStatus: 'in_stock' | 'out_of_stock' | 'on_backorder';
}
export interface ProductDimensions {
    length: number;
    width: number;
    height: number;
    weight: number;
    unit: 'cm' | 'inch';
    weightUnit: 'kg' | 'lb';
}
export interface ProductImage {
    id: string;
    url: string;
    alt: string;
    title?: string;
    caption?: string;
    sortOrder: number;
    isFeatured: boolean;
}
export interface ProductVariation {
    id: string;
    name: string;
    sku: string;
    price: PriceByRole;
    inventory: InventoryInfo;
    attributes: Record<string, string>;
    images?: ProductImage[];
}
export interface Product {
    id: string;
    name: string;
    slug: string;
    sku: string;
    description: string;
    shortDescription: string;
    pricing: PriceByRole;
    cost?: number;
    inventory: InventoryInfo;
    images: ProductImage[];
    featuredImageUrl?: string;
    categories: string[];
    tags: string[];
    specifications: Record<string, string>;
    attributes: Record<string, string>;
    dimensions?: ProductDimensions;
    brand?: string;
    model?: string;
    supplierId: string;
    supplierName: string;
    status: ProductStatus;
    approvalStatus: 'pending' | 'approved' | 'rejected';
    approvedAt?: string;
    approvedBy?: string;
    viewCount: number;
    salesCount: number;
    rating: number;
    reviewCount: number;
    seo?: {
        metaTitle?: string;
        metaDescription?: string;
        keywords?: string[];
        ogTitle?: string;
        ogDescription?: string;
        ogImage?: string;
    };
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    variations?: ProductVariation[];
    isFeatured: boolean;
    isVirtual: boolean;
    isDownloadable: boolean;
    shippingClass?: string;
    shippingInfo?: {
        weight: number;
        dimensions: ProductDimensions;
        shippingCost: number;
        freeShippingThreshold?: number;
    };
}
export interface Address {
    recipientName: string;
    phone: string;
    email?: string;
    company?: string;
    zipCode: string;
    address: string;
    detailAddress: string;
    city: string;
    state?: string;
    country: string;
    deliveryRequest?: string;
    isDefault?: boolean;
}
export interface OrderItem {
    id: string;
    productId: string;
    productName: string;
    productSku: string;
    productImage: string;
    productBrand?: string;
    variationId?: string;
    variationName?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    supplierId: string;
    supplierName: string;
    attributes?: Record<string, string>;
    notes?: string;
}
export interface OrderSummary {
    subtotal: number;
    discount: number;
    shipping: number;
    tax: number;
    total: number;
    handlingFee?: number;
    insuranceFee?: number;
    serviceFee?: number;
}
export interface Order {
    id: string;
    orderNumber: string;
    buyerId: string;
    buyerType: UserRole;
    buyerName: string;
    buyerEmail: string;
    buyerGrade?: RetailerGrade;
    items: OrderItem[];
    summary: OrderSummary;
    currency: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    paymentMethod?: PaymentMethod;
    billingAddress: Address;
    shippingAddress: Address;
    shippingMethod?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    orderDate: string;
    paymentDate?: string;
    confirmedDate?: string;
    shippingDate?: string;
    deliveryDate?: string;
    cancelledDate?: string;
    notes?: string;
    customerNotes?: string;
    adminNotes?: string;
    cancellationReason?: string;
    returnReason?: string;
    refundAmount?: number;
    refundDate?: string;
    source?: 'web' | 'mobile' | 'api' | 'admin';
    createdAt: string;
    updatedAt: string;
}
export interface CartItem {
    id: string;
    cartId?: string;
    productId: string;
    productName?: string;
    productSku?: string;
    productImage?: string;
    productBrand?: string;
    variationId?: string;
    variationName?: string;
    unitPrice?: number;
    quantity: number;
    product?: Product;
    maxOrderQuantity?: number;
    stockQuantity?: number;
    supplierId?: string;
    supplierName?: string;
    attributes?: Record<string, string>;
    addedAt?: string;
    createdAt: string;
    updatedAt: string;
}
export interface Cart {
    id: string;
    userId: string;
    items: CartItem[];
    summary: OrderSummary;
    coupons?: string[];
    discountCodes?: string[];
    sessionId?: string;
    createdAt: string;
    updatedAt: string;
    expiresAt?: string;
}
export interface Review {
    id: string;
    productId: string;
    userId: string;
    orderId?: string;
    rating: number;
    title: string;
    content: string;
    images?: string[];
    verified: boolean;
    helpful: number;
    unhelpful: number;
    reported: boolean;
    reportReason?: string;
    status: ReviewStatus;
    createdAt: string;
    updatedAt: string;
    user?: User;
    product?: Product;
    order?: Order;
}
export declare enum ReviewStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
    HIDDEN = "hidden"
}
export interface ReviewStats {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
    };
    verifiedPercentage: number;
}
export interface ReviewFilters {
    productId?: string;
    userId?: string;
    rating?: number;
    verified?: boolean;
    status?: ReviewStatus;
    search?: string;
    sort?: 'recent' | 'helpful' | 'rating_high' | 'rating_low';
    page?: number;
    limit?: number;
}
export interface ReviewsResponse {
    reviews: Review[];
    total: number;
    page: number;
    totalPages: number;
    stats?: ReviewStats;
}
export interface CreateReviewDto {
    productId: string;
    orderId?: string;
    rating: number;
    title: string;
    content: string;
    images?: string[];
}
export interface UpdateReviewDto {
    rating?: number;
    title?: string;
    content?: string;
    images?: string[];
}
export interface ReviewHelpfulDto {
    helpful: boolean;
}
export interface ProductFilters {
    search?: string;
    category?: string;
    categoryId?: string;
    categoryIds?: string[];
    supplierId?: string;
    brand?: string;
    brandId?: string;
    status?: ProductStatus;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    minPrice?: number;
    maxPrice?: number;
    priceRange?: [number, number];
    minRating?: number;
    inStock?: boolean;
    onSale?: boolean;
    featured?: boolean;
    isFeatured?: boolean;
    attributes?: Record<string, string[]>;
    sort?: string;
    sortBy?: 'name' | 'price' | 'created' | 'updated' | 'sales' | 'rating' | 'popularity' | 'newest';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}
export interface OrderFilters {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    buyerType?: UserRole;
    supplierId?: string;
    dateFrom?: string;
    dateTo?: string;
    minAmount?: number;
    maxAmount?: number;
    search?: string;
    sortBy?: 'orderDate' | 'totalAmount' | 'status' | 'buyerName';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}
export interface Pagination {
    current: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}
export interface EcommerceApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    errors?: Record<string, string[]>;
    meta?: {
        pagination?: Pagination;
        filters?: Record<string, unknown>;
        timestamp: string;
    };
}
export interface ProductsResponse {
    products: Product[];
    pagination: Pagination;
    aggregations?: {
        categories: {
            id: string;
            name: string;
            count: number;
        }[];
        brands: {
            id: string;
            name: string;
            count: number;
        }[];
        priceRanges: {
            min: number;
            max: number;
            count: number;
        }[];
        ratings: {
            rating: number;
            count: number;
        }[];
    };
}
export interface OrdersResponse {
    orders: Order[];
    pagination: Pagination;
    summary?: {
        totalOrders: number;
        totalAmount: number;
        averageOrderValue: number;
        statusCounts: Record<OrderStatus, number>;
    };
}
export interface ProductFormData {
    name: string;
    description: string;
    shortDescription: string;
    sku: string;
    pricing: PriceByRole;
    cost?: number;
    stockQuantity: number;
    minOrderQuantity: number;
    maxOrderQuantity?: number;
    lowStockThreshold: number;
    manageStock: boolean;
    allowBackorder: boolean;
    images: (File | string)[];
    featuredImageUrl?: string;
    categories: string[];
    tags: string[];
    specifications: Record<string, string>;
    attributes: Record<string, string>;
    brand?: string;
    model?: string;
    dimensions?: ProductDimensions;
    seo?: {
        metaTitle?: string;
        metaDescription?: string;
        keywords?: string[];
    };
    isFeatured: boolean;
    isVirtual: boolean;
    isDownloadable: boolean;
}
export interface CreateOrderRequest {
    items: {
        productId: string;
        variationId?: string;
        quantity: number;
        unitPrice: number;
        attributes?: Record<string, string>;
    }[];
    billingAddress: Address;
    shippingAddress: Address;
    paymentMethod: PaymentMethod;
    notes?: string;
    customerNotes?: string;
    coupons?: string[];
    discountCodes?: string[];
}
export type CreateProductDto = Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'viewCount' | 'salesCount' | 'rating' | 'reviewCount'>;
export type UpdateProductDto = Partial<CreateProductDto>;
export type CreateOrderDto = Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt' | 'status' | 'paymentStatus'>;
export type UpdateOrderDto = Partial<Pick<Order, 'status' | 'paymentStatus' | 'trackingNumber' | 'notes' | 'adminNotes'>>;
export type CreateCartItemDto = Omit<CartItem, 'id' | 'addedAt' | 'updatedAt'>;
export type UpdateCartItemDto = Pick<CartItem, 'quantity' | 'attributes'>;
export interface PriceCalculation {
    basePrice: number;
    discountAmount: number;
    discountPercentage: number;
    finalPrice: number;
    currency: string;
    priceBreakdown?: {
        product: number;
        tax: number;
        shipping: number;
        discount: number;
        total: number;
    };
}
export interface SupplierProfile {
    id: string;
    supplierId: string;
    storeName: string;
    storeSlug: string;
    logo?: string;
    banner?: string;
    description?: string;
    shippingPolicy?: string;
    returnPolicy?: string;
    warrantyPolicy?: string;
    contactEmail?: string;
    contactPhone?: string;
    businessHours?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    businessNumber: string;
    businessName: string;
    representativeName: string;
    totalProducts?: number;
    totalOrders?: number;
    totalRevenue?: number;
    isActive: boolean;
    isVerified: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface SupplierProfileFormData {
    storeName: string;
    storeSlug?: string;
    description?: string;
    logo?: File | string;
    banner?: File | string;
    shippingPolicy?: string;
    returnPolicy?: string;
    warrantyPolicy?: string;
    contactEmail?: string;
    contactPhone?: string;
    businessHours?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
}
export interface SupplierStats {
    totalProducts: number;
    activeProducts: number;
    totalOrders: number;
    pendingOrders: number;
    totalRevenue: number;
    monthlyRevenue: number;
    averageOrderValue: number;
    topProducts: {
        product: Product;
        salesCount: number;
        revenue: number;
    }[];
}
export interface SupplierPublicProfile {
    id: string;
    storeName: string;
    storeSlug: string;
    logo?: string;
    banner?: string;
    description?: string;
    shippingPolicy?: string;
    returnPolicy?: string;
    warrantyPolicy?: string;
    businessHours?: string;
    city?: string;
    state?: string;
    isVerified: boolean;
    totalProducts: number;
    createdAt: string;
}
//# sourceMappingURL=ecommerce.d.ts.map