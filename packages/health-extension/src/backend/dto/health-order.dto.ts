/**
 * Health Order DTOs
 *
 * @package @o4o/health-extension
 */

/**
 * Create Health Order Request DTO
 */
export interface CreateHealthOrderRequestDto {
  offerId: string;
  buyerId: string;
  quantity: number;
  metadata?: Record<string, any>;
}

/**
 * Health Order Filter DTO
 */
export interface HealthOrderFilterDto {
  buyerId?: string;
  sellerId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

/**
 * Health Order Response DTO
 */
export interface HealthOrderResponseDto {
  id: string;
  offerId: string;
  productId: string;
  productName: string;
  buyerId: string;
  sellerId: string;
  quantity: number;
  totalAmount: number;
  status: string;
  healthInfo: {
    functionDescription: string;
    intakeMethod: string;
    caution: string;
    expirationDate: string;
  };
  createdAt?: string;
}

/**
 * Update Order Status Request DTO
 */
export interface UpdateOrderStatusRequestDto {
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'completed' | 'cancelled';
}

/**
 * Create Order Result DTO
 */
export interface CreateOrderResultDto {
  success: boolean;
  order?: HealthOrderResponseDto;
  errors?: string[];
  warnings?: string[];
}

/**
 * Seller Order Summary DTO
 */
export interface SellerOrderSummaryDto {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
}
