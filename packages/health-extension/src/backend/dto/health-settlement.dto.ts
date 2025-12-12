/**
 * Health Settlement DTOs
 *
 * @package @o4o/health-extension
 */

/**
 * Create Health Settlement Request DTO
 */
export interface CreateHealthSettlementRequestDto {
  orderId: string;
  commissionRate?: number;
}

/**
 * Health Settlement Filter DTO
 */
export interface HealthSettlementFilterDto {
  sellerId?: string;
  supplierId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Health Settlement Response DTO
 */
export interface HealthSettlementResponseDto {
  id: string;
  sellerId: string;
  supplierId?: string;
  orderId: string;
  amount: number;
  commission: number;
  netAmount: number;
  status: string;
  settlementDate?: string;
  createdAt?: string;
}

/**
 * Health Settlement Summary DTO
 */
export interface HealthSettlementSummaryDto {
  totalSettlements: number;
  pendingAmount: number;
  completedAmount: number;
  totalCommission: number;
  periodStart?: string;
  periodEnd?: string;
}

/**
 * Create Settlement Result DTO
 */
export interface CreateSettlementResultDto {
  success: boolean;
  settlement?: HealthSettlementResponseDto;
  errors?: string[];
}

/**
 * Process Settlement Result DTO
 */
export interface ProcessSettlementResultDto {
  success: boolean;
  errors?: string[];
}
