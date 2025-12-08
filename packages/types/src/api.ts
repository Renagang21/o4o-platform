// API related types

/**
 * General API Error Codes (SSOT)
 */
export const API_ERROR_CODES = {
  // Generic errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // Resource errors (404)
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',

  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Conflict errors (409)
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',

  // Rate limiting (429)
  RATE_LIMITED: 'RATE_LIMITED',

  // Database errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  QUERY_FAILED: 'QUERY_FAILED',

  // File/Upload errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',

  // External service errors
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  EMAIL_SEND_FAILED: 'EMAIL_SEND_FAILED',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

/**
 * HTTP Status Codes (for reference)
 */
export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

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
  error: string;        // Human-readable message
  code?: string;        // Machine-readable error code (ApiErrorCode or AuthErrorCode)
  details?: unknown;    // Additional error details (validation errors, etc.)
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

// Pagination types
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
    page: number;        // Renamed for consistency
    limit: number;       // Renamed for consistency
    total: number;       // Total items
    totalPages: number;
  };
  // Legacy aliases for backward compatibility
  currentPage?: number;
  pageSize?: number;
  totalItems?: number;
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
  role?: 'customer' | 'business' | 'affiliate' | 'partner';
}

export interface UpdateProfilePayload {
  name?: string;
  avatar?: string;
  phone?: string;
  address?: string;
}

// API Payload types for product operations
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

// API Payload types for order operations
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

// Review types for API
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

// API Filter types
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