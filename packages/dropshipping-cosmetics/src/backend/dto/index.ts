/**
 * Dropshipping Cosmetics DTOs
 *
 * Phase 9-C: Core v2 정렬
 * - Core enum 타입 re-export
 * - Cosmetics 전용 DTO 정의
 */

// ====== Core Types Re-export ======
export { ProductType, ProductStatus } from '@o4o/dropshipping-core';
export type {
  OfferCreationContext,
  ListingCreationContext,
  OrderCreationContext,
  ValidationResult,
} from '@o4o/dropshipping-core';

// Import and re-export RoutineStep from types.ts for backward compatibility
import type { RoutineStep as RoutineStepType } from '../../types.js';
export type { RoutineStep } from '../../types.js';

// Local alias for use in this file
type RoutineStep = RoutineStepType;

// ====== Cosmetics Metadata Types ======

/**
 * 화장품 메타데이터 타입
 */
export interface CosmeticsProductMetadata {
  skinType?: string[];
  concerns?: string[];
  certifications?: string[];
  productCategory?: string;
  ingredients?: Array<{ name: string; description?: string; percentage?: number }>;
  routineInfo?: {
    timeOfUse?: string[];
    step?: string;
    orderInRoutine?: number;
  };
  contraindications?: string;
  texture?: string;
  volume?: string;
  expiryPeriod?: string;
}

/**
 * 화장품 필터 타입
 */
export interface CosmeticsFiltersDto {
  skinType?: string[];
  concerns?: string[];
  certifications?: string[];
  category?: string;
  texture?: string;
  timeOfUse?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 화장품 제품 응답 DTO
 */
export interface CosmeticsProductDto {
  id: string;
  title: string;
  brand: string;
  price: number;
  image: string;
  description?: string;
  metadata: CosmeticsProductMetadata;
  routineMatches?: {
    id: string;
    title: string;
    partnerId: string;
  }[];
}

/**
 * 화장품 루틴 단계 DTO
 */
export interface RoutineStepDto {
  step: number;
  category: string;
  product?: any;  // Reference to product entity (backward compatibility)
  productId?: string;
  productName?: string;
  description: string;
  orderInRoutine: number;
}

/**
 * 인플루언서 루틴 DTO
 */
export interface InfluencerRoutineDto {
  id: string;
  partnerId: string;
  title: string;
  description?: string;
  skinType: string[];
  concerns: string[];
  timeOfUse: 'morning' | 'evening' | 'both';
  steps: RoutineStepDto[];
  tags?: string[];
  isPublished: boolean;
  viewCount: number;
  recommendCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 루틴 생성 DTO
 * Note: `routine` uses RoutineStep from types.ts for backward compatibility
 */
export interface CreateRoutineDto {
  partnerId: string;
  title: string;
  description?: string;
  skinType: string[];
  concerns: string[];
  timeOfUse: 'morning' | 'evening' | 'both';
  routine: RoutineStep[];  // Uses RoutineStep for backward compatibility
  tags?: string[];
}

/**
 * 루틴 업데이트 DTO
 */
export interface UpdateRoutineDto extends Partial<CreateRoutineDto> {
  isPublished?: boolean;
}

/**
 * 셀러 워크플로우 세션 DTO
 */
export interface SellerWorkflowSessionDto {
  id: string;
  sellerId: string;
  customerProfile: {
    skinTypes?: string[];
    concerns?: string[];
    preferences?: Record<string, any>;
  };
  recommendedProducts: Array<{
    productId: string;
    score: number;
    reason?: string;
  }>;
  recommendedRoutines: Array<{
    routineId: string;
    matchScore: number;
  }>;
  metadata: Record<string, any>;
  createdAt: Date;
}

/**
 * 캠페인 DTO
 */
export interface CosmeticsCampaignDto {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  targetSkinTypes?: string[];
  targetConcerns?: string[];
  products: string[];
  isActive: boolean;
}

/**
 * 브랜드 DTO
 */
export interface CosmeticsBrandDto {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  certifications?: string[];
  country?: string;
  isActive: boolean;
}

/**
 * 필터 설정 DTO
 */
export interface FilterConfigurationDto {
  id: string;
  name: string;
  type: 'skinType' | 'concerns' | 'certifications' | 'category' | 'texture';
  values: string[];
  enabled: boolean;
}

// ====== Constants ======

/**
 * 화장품 제품 카테고리
 */
export const COSMETICS_CATEGORIES = {
  SKINCARE: 'skincare',
  CLEANSING: 'cleansing',
  MAKEUP: 'makeup',
  SUNCARE: 'suncare',
  MASK: 'mask',
  BODYCARE: 'bodycare',
  HAIRCARE: 'haircare',
} as const;

/**
 * 피부 타입
 */
export const SKIN_TYPES = {
  DRY: 'dry',
  OILY: 'oily',
  COMBINATION: 'combination',
  SENSITIVE: 'sensitive',
  NORMAL: 'normal',
} as const;

/**
 * 피부 고민
 */
export const SKIN_CONCERNS = {
  ACNE: 'acne',
  WHITENING: 'whitening',
  WRINKLE: 'wrinkle',
  PORE: 'pore',
  SOOTHING: 'soothing',
  MOISTURIZING: 'moisturizing',
  ELASTICITY: 'elasticity',
  TROUBLE: 'trouble',
} as const;

/**
 * 인증 타입
 */
export const CERTIFICATIONS = {
  VEGAN: 'vegan',
  HYPOALLERGENIC: 'hypoallergenic',
  ORGANIC: 'organic',
  EWG_GREEN: 'ewgGreen',
  CRUELTY_FREE: 'crueltyfree',
  DERMATOLOGICALLY_TESTED: 'dermatologicallyTested',
} as const;
