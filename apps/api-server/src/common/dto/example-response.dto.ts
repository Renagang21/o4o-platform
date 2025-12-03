/**
 * EXAMPLE RESPONSE DTO TEMPLATE
 *
 * This file shows how to structure response DTOs.
 * Response DTOs typically use interfaces (not classes) since they don't need validation.
 */

/**
 * Standard Success Response
 */
export interface SuccessResponseDto<T> {
  success: true;
  data: T;
}

/**
 * Standard Error Response
 */
export interface ErrorResponseDto {
  success: false;
  error: string;
  details?: any;
}

/**
 * Example: User Response DTO
 */
export interface ExampleUserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  // Never include sensitive data like passwords in response DTOs
}

/**
 * Example: Login Response DTO
 */
export interface ExampleLoginResponseDto {
  user: ExampleUserResponseDto;
  token: string;
  refreshToken?: string;
  expiresIn: number;
}

/**
 * Example: Product Response DTO
 */
export interface ExampleProductResponseDto {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  isActive: boolean;
  tags: string[];
  imageUrl?: string;
  seller: {
    id: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Example: Paginated Products Response
 */
export interface ExampleProductsListResponseDto {
  success: true;
  data: ExampleProductResponseDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Example: Order Response with Nested Data
 */
export interface ExampleOrderResponseDto {
  id: string;
  orderNumber: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  customer: {
    id: string;
    name: string;
    email: string;
  };
  items: Array<{
    id: string;
    product: {
      id: string;
      name: string;
      price: number;
    };
    quantity: number;
    subtotal: number;
  }>;
  totalAmount: number;
  shippingAddress: {
    street: string;
    city: string;
    zipCode: string;
    country: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Example: Statistics Response
 */
export interface ExampleStatsResponseDto {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    totalSold: number;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
  }>;
}

/**
 * Example: Validation Error Response
 */
export interface ValidationErrorResponseDto {
  success: false;
  error: 'Validation failed';
  details: Array<{
    property: string;
    constraints: {
      [key: string]: string;
    };
    value?: any;
  }>;
}

/**
 * RESPONSE DTO BEST PRACTICES:
 *
 * 1. Use interfaces for response DTOs (no validation needed)
 * 2. Never include sensitive data (passwords, tokens in plain text, etc.)
 * 3. Use consistent naming: <Entity>ResponseDto
 * 4. Include metadata when useful (timestamps, related data IDs, etc.)
 * 5. For collections, use paginated responses
 * 6. Keep responses flat when possible, nest only when necessary
 * 7. Document all fields with JSDoc comments in production DTOs
 * 8. Use Pick<Entity, 'field1' | 'field2'> to create DTOs from entities
 * 9. Use Omit<Entity, 'password' | 'sensitiveField'> to exclude fields
 *
 * Example using utility types:
 * ```typescript
 * import { User } from '../entities/User';
 *
 * // Exclude sensitive fields
 * export type UserResponseDto = Omit<User, 'password' | 'resetToken'>;
 *
 * // Pick specific fields
 * export type UserSummaryDto = Pick<User, 'id' | 'email' | 'firstName' | 'lastName'>;
 * ```
 */
