/**
 * Health Offer DTOs
 *
 * @package @o4o/health-extension
 */

import type { HealthCategory } from '../../types.js';

/**
 * Create Health Offer Request DTO
 */
export interface CreateHealthOfferRequestDto {
  productId: string;
  sellerId: string;
  price: number;
  metadata?: Record<string, any>;
}

/**
 * Health Offer Filter DTO
 */
export interface HealthOfferFilterDto {
  sellerId?: string;
  status?: string;
  expirationWithinDays?: number;
  page?: number;
  limit?: number;
}

/**
 * Health Offer Response DTO
 */
export interface HealthOfferResponseDto {
  id: string;
  productId: string;
  productName: string;
  sellerId: string;
  price: number;
  status: string;
  healthMetadata: {
    expirationDate: string;
    functionDescription: string;
    intakeMethod: string;
    healthCategory: HealthCategory;
  };
  expirationStatus: {
    isExpired: boolean;
    isNear: boolean;
    daysRemaining: number;
  };
}

/**
 * Update Offer Status Request DTO
 */
export interface UpdateOfferStatusRequestDto {
  status: 'pending' | 'active' | 'inactive' | 'rejected';
}

/**
 * Create Offer Result DTO
 */
export interface CreateOfferResultDto {
  success: boolean;
  offer?: HealthOfferResponseDto;
  errors?: string[];
  warnings?: string[];
}
