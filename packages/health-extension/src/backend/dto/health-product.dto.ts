/**
 * Health Product DTOs
 *
 * @package @o4o/health-extension
 */

import type {
  HealthCategory,
  TargetGroup,
  HealthCertification,
  ProductForm,
  AllergyType,
  StorageMethod,
  NutritionInfo,
} from '../../types.js';

/**
 * Health Product Filter DTO
 */
export interface HealthProductFilterDto {
  healthCategory?: HealthCategory;
  targetGroup?: TargetGroup[];
  certifications?: HealthCertification[];
  form?: ProductForm;
  allergyFree?: AllergyType[];
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Health Product Response DTO
 */
export interface HealthProductResponseDto {
  id: string;
  title: string;
  brand: string;
  price: number;
  image: string;
  description?: string;
  metadata: {
    nutritionInfo?: NutritionInfo[];
    functionDescription: string;
    intakeMethod: string;
    dailyDosage?: string;
    caution: string;
    allergyInfo?: AllergyType[];
    expirationDate: string;
    storageMethod?: StorageMethod;
    manufacturer?: string;
    importer?: string;
    certifications?: HealthCertification[];
    healthCategory: HealthCategory;
    targetGroup?: TargetGroup[];
    form?: ProductForm;
    servingSize?: string;
    servingsPerContainer?: number;
  };
  expirationStatus: {
    isExpired: boolean;
    isNear: boolean;
    daysUntilExpiration: number | null;
  };
}

/**
 * Health Product List Item DTO
 */
export interface HealthProductListItemDto {
  id: string;
  title: string;
  brand: string;
  price: number;
  image: string;
  healthCategory: HealthCategory;
  expirationDate?: string;
  certifications: HealthCertification[];
  isExpired: boolean;
  isExpirationNear: boolean;
}

/**
 * Health Product Validation Result DTO
 */
export interface HealthProductValidationDto {
  valid: boolean;
  errors: string[];
}
