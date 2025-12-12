/**
 * Cosmetics Extension Types
 *
 * Phase 9-C: Core v2 정렬
 * - ProductType enum 사용
 * - CosmeticsMetadata를 Core와 정렬
 */

// Re-export Core types
export { ProductType, ProductStatus } from '@o4o/dropshipping-core';

/**
 * 화장품 메타데이터 타입
 * Core ProductMaster.attributes의 cosmetics 확장 필드
 */
export interface CosmeticsMetadata {
  skinType?: string[];
  concerns?: string[];
  ingredients?: Array<{
    name: string;
    description?: string;
    percentage?: number;
  }>;
  certifications?: string[];
  productCategory?: string;
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

export interface CosmeticsFilters {
  skinType?: string[];
  concerns?: string[];
  certifications?: string[];
  category?: string;
  timeOfUse?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface RoutineRequest {
  skinType: string;
  concerns: string[];
  timeOfUse: 'morning' | 'evening';
}

export interface RoutineStep {
  step: number;
  category: string;
  product: any; // Reference to product entity
  description: string;
  orderInRoutine: number;
}

export interface RoutineRecommendation {
  skinType: string;
  concerns: string[];
  timeOfUse: 'morning' | 'evening';
  routine: RoutineStep[];
  totalSteps: number;
  estimatedTime: string;
  tips: string[];
}

export interface InfluencerRoutine {
  id: string;
  partnerId: string;
  title: string;
  description?: string;
  skinType: string[];
  concerns: string[];
  timeOfUse: 'morning' | 'evening' | 'both';
  routine: RoutineStep[];
  tags?: string[];
  isPublished: boolean;
  viewCount: number;
  recommendCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// CreateRoutineDto, UpdateRoutineDto are now in backend/dto/index.ts
// Re-exported from there via main index.ts
