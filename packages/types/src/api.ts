// API related types
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

// Pagination types
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

// API request types
export interface ApiRequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  timeout?: number;
}

// Common API payloads
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

// Product types for API
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  images: string[];
  categoryId: string;
  categoryName?: string;
  tags: string[];
  stock: number;
  isActive: boolean;
  sellerId: string;
  sellerName?: string;
  createdAt: Date;
  updatedAt: Date;
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

// Order types for API
export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  userName?: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: Address;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface CreateOrderPayload {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  shippingAddress: Address;
  paymentMethod: string;
}

// Review types for API
export interface Review {
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

// Payment types
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

// Filter types
export interface ProductFilters {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  isActive?: boolean;
  sellerId?: string;
  search?: string;
}

export interface OrderFilters {
  status?: Order['status'];
  paymentStatus?: Order['paymentStatus'];
  dateFrom?: Date;
  dateTo?: Date;
  userId?: string;
}

// Sort options
export type SortOption = 
  | 'createdAt'
  | '-createdAt'
  | 'price'
  | '-price'
  | 'name'
  | '-name'
  | 'popularity'
  | '-popularity';