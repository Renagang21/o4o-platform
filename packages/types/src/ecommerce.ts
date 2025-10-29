// =============================================================================
// E-COMMERCE CORE TYPES
// =============================================================================
// 통합된 전자상거래 타입 정의 - O4O 플랫폼용
// 역할 기반 가격 정책과 다중 비즈니스 모델 지원

import type { User, UserRole } from './auth.js';

// =============================================================================
// CORE ENUMS
// =============================================================================

// UserRole is now imported from auth.ts which includes all roles

export type ProductStatus = 
  | 'draft'         // 초안
  | 'pending'       // 승인 대기
  | 'approved'      // 승인됨  
  | 'active'        // 활성
  | 'inactive'      // 비활성
  | 'out_of_stock'  // 품절
  | 'discontinued'; // 단종

export type OrderStatus = 
  | 'pending'       // 주문 대기
  | 'confirmed'     // 주문 확인
  | 'processing'    // 처리 중
  | 'shipped'       // 배송 시작
  | 'delivered'     // 배송 완료
  | 'cancelled'     // 주문 취소
  | 'returned';     // 반품

export type PaymentStatus = 
  | 'pending'       // 결제 대기
  | 'completed'     // 결제 완료
  | 'failed'        // 결제 실패
  | 'refunded';     // 환불 완료

export type PaymentMethod = 
  | 'card'              // 신용카드
  | 'transfer'          // 계좌이체
  | 'virtual_account'   // 가상계좌
  | 'kakao_pay'         // 카카오페이
  | 'naver_pay'         // 네이버페이
  | 'paypal'            // 페이팔
  | 'cash_on_delivery'; // 착불

export type RetailerGrade = 'gold' | 'premium' | 'vip';

// =============================================================================
// CATEGORY & CLASSIFICATION
// =============================================================================

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

// =============================================================================
// PRICING & INVENTORY
// =============================================================================

export interface PriceByRole {
  customer: number;      // 소비자 가격 (retailPrice)
  business: number;      // 도매 가격 (wholesalePrice) 
  affiliate: number;     // 제휴 가격 (affiliatePrice)
  retailer: {
    gold: number;        // 골드 등급 리테일러 가격
    premium: number;     // 프리미엄 등급 리테일러 가격
    vip: number;         // VIP 등급 리테일러 가격
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

// =============================================================================
// PRODUCT TYPES
// =============================================================================

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
  
  // Pricing - role-based pricing system
  pricing: PriceByRole;
  cost?: number; // 원가
  
  // Inventory management
  inventory: InventoryInfo;
  
  // Media
  images: ProductImage[];
  featuredImageUrl?: string;
  
  // Classification
  categories: string[]; // category IDs
  tags: string[]; // tag IDs
  
  // Product attributes
  specifications: Record<string, string>;
  attributes: Record<string, string>;
  dimensions?: ProductDimensions;
  brand?: string;
  model?: string;
  
  // Business info
  supplierId: string;
  supplierName: string;
  
  // Status and approval
  status: ProductStatus;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedAt?: string;
  approvedBy?: string;
  
  // Analytics
  viewCount: number;
  salesCount: number;
  rating: number;
  reviewCount: number;
  
  // SEO
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
  };
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  
  // Variations (for variable products)
  variations?: ProductVariation[];
  
  // Special flags
  isFeatured: boolean;
  isVirtual: boolean;
  isDownloadable: boolean;
  
  // Shipping info
  shippingClass?: string;
  shippingInfo?: {
    weight: number;
    dimensions: ProductDimensions;
    shippingCost: number;
    freeShippingThreshold?: number;
  };
}

// =============================================================================
// ORDER TYPES
// =============================================================================

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
  
  // Supplier info
  supplierId: string;
  supplierName: string;
  
  // Product attributes at time of order
  attributes?: Record<string, string>;
  notes?: string;
}

export interface OrderSummary {
  subtotal: number;      // 상품 소계
  discount: number;      // 할인 금액
  shipping: number;      // 배송비
  tax: number;          // 세금
  total: number;        // 총 금액
  
  // Additional fees
  handlingFee?: number;
  insuranceFee?: number;
  serviceFee?: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  
  // Buyer information
  buyerId: string;
  buyerType: UserRole;
  buyerName: string;
  buyerEmail: string;
  buyerGrade?: RetailerGrade;
  
  // Order items
  items: OrderItem[];
  
  // Financial info
  summary: OrderSummary;
  currency: string;
  
  // Status tracking
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  
  // Addresses
  billingAddress: Address;
  shippingAddress: Address;
  
  // Shipping & tracking
  shippingMethod?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  
  // Timestamps
  orderDate: string;
  paymentDate?: string;
  confirmedDate?: string;
  shippingDate?: string;
  deliveryDate?: string;
  cancelledDate?: string;
  
  // Additional info
  notes?: string;
  customerNotes?: string;
  adminNotes?: string;
  
  // Cancellation & returns
  cancellationReason?: string;
  returnReason?: string;
  refundAmount?: number;
  refundDate?: string;
  
  // Metadata
  source?: 'web' | 'mobile' | 'api' | 'admin';
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// CART TYPES
// =============================================================================

export interface CartItem {
  id: string;
  cartId?: string; // Added for compatibility with stores
  productId: string;
  productName?: string;
  productSku?: string;
  productImage?: string;
  productBrand?: string;
  variationId?: string;
  variationName?: string;
  unitPrice?: number;
  quantity: number;
  
  // Product reference for client-side stores
  product?: Product;
  
  // Constraints
  maxOrderQuantity?: number;
  stockQuantity?: number;
  
  // Supplier info
  supplierId?: string;
  supplierName?: string;
  
  // Product attributes
  attributes?: Record<string, string>;
  
  // Timestamps
  addedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  summary: OrderSummary;
  
  // Applied promotions
  coupons?: string[];
  discountCodes?: string[];
  
  // Session info
  sessionId?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

// =============================================================================
// REVIEW & RATING TYPES
// =============================================================================

export interface Review {
  id: string;
  productId: string;
  userId: string;
  orderId?: string; // For verified purchase
  rating: number; // 1-5
  title: string;
  content: string;
  images?: string[];
  verified: boolean; // Verified purchase
  helpful: number; // Helpful count
  unhelpful: number; // Unhelpful count
  reported: boolean;
  reportReason?: string;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
  // Relations
  user?: User;
  product?: Product;
  order?: Order;
}

export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  HIDDEN = 'hidden'
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

// =============================================================================
// FILTER & SEARCH TYPES
// =============================================================================

export interface ProductFilters {
  search?: string;
  category?: string; // Add this for compatibility
  categoryId?: string;
  categoryIds?: string[];
  supplierId?: string;
  brand?: string; // Add this for compatibility
  brandId?: string;
  status?: ProductStatus;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  
  // Price range
  minPrice?: number;
  maxPrice?: number;
  priceRange?: [number, number];
  
  // Rating
  minRating?: number;
  
  // Availability
  inStock?: boolean;
  onSale?: boolean;
  featured?: boolean; // Change from isFeatured
  isFeatured?: boolean; // Keep for backward compatibility
  
  // Attributes
  attributes?: Record<string, string[]>;
  
  // Sorting
  sort?: string; // Add this for compatibility
  sortBy?: 'name' | 'price' | 'created' | 'updated' | 'sales' | 'rating' | 'popularity' | 'newest';
  sortOrder?: 'asc' | 'desc';
  
  // Pagination
  page?: number;
  limit?: number;
}

export interface OrderFilters {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  buyerType?: UserRole;
  supplierId?: string;
  
  // Date ranges
  dateFrom?: string;
  dateTo?: string;
  
  // Amount ranges
  minAmount?: number;
  maxAmount?: number;
  
  // Search
  search?: string; // order number, buyer name, etc.
  
  // Sorting
  sortBy?: 'orderDate' | 'totalAmount' | 'status' | 'buyerName';
  sortOrder?: 'asc' | 'desc';
  
  // Pagination
  page?: number;
  limit?: number;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface Pagination {
  current: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// EcommerceApiResponse to avoid conflict with api.ts
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
    categories: { id: string; name: string; count: number }[];
    brands: { id: string; name: string; count: number }[];
    priceRanges: { min: number; max: number; count: number }[];
    ratings: { rating: number; count: number }[];
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

// =============================================================================
// FORM DATA TYPES
// =============================================================================

export interface ProductFormData {
  name: string;
  description: string;
  shortDescription: string;
  sku: string;
  
  // Pricing
  pricing: PriceByRole;
  cost?: number;
  
  // Inventory
  stockQuantity: number;
  minOrderQuantity: number;
  maxOrderQuantity?: number;
  lowStockThreshold: number;
  manageStock: boolean;
  allowBackorder: boolean;
  
  // Media
  images: (File | string)[];
  featuredImageUrl?: string;
  
  // Classification
  categories: string[];
  tags: string[];
  
  // Attributes
  specifications: Record<string, string>;
  attributes: Record<string, string>;
  brand?: string;
  model?: string;
  
  // Dimensions
  dimensions?: ProductDimensions;
  
  // SEO
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
  
  // Flags
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
  
  // Promotion codes
  coupons?: string[];
  discountCodes?: string[];
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type CreateProductDto = Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'viewCount' | 'salesCount' | 'rating' | 'reviewCount'>;
export type UpdateProductDto = Partial<CreateProductDto>;

export type CreateOrderDto = Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt' | 'status' | 'paymentStatus'>;
export type UpdateOrderDto = Partial<Pick<Order, 'status' | 'paymentStatus' | 'trackingNumber' | 'notes' | 'adminNotes'>>;

export type CreateCartItemDto = Omit<CartItem, 'id' | 'addedAt' | 'updatedAt'>;
export type UpdateCartItemDto = Pick<CartItem, 'quantity' | 'attributes'>;

// Price calculation utility type
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

// =============================================================================
// SUPPLIER STORE TYPES
// =============================================================================

export interface SupplierProfile {
  id: string;
  supplierId: string;
  storeName: string;
  storeSlug: string; // URL-friendly name
  logo?: string;
  banner?: string;
  description?: string;
  
  // Policies
  shippingPolicy?: string;
  returnPolicy?: string;
  warrantyPolicy?: string;
  
  // Contact
  contactEmail?: string;
  contactPhone?: string;
  businessHours?: string;
  
  // Location
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  
  // Business Info
  businessNumber: string;
  businessName: string;
  representativeName: string;
  
  // Stats (calculated)
  totalProducts?: number;
  totalOrders?: number;
  totalRevenue?: number;
  
  // Status
  isActive: boolean;
  isVerified: boolean;
  
  // Timestamps
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

// Export specific types if needed