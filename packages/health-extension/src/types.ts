/**
 * Health Extension Types
 *
 * @package @o4o/health-extension
 */

// ===== Nutrition Information =====

export interface NutritionInfo {
  name: string;
  amount: string;
  unit: string;
  dailyValue?: number;
}

// ===== Health Metadata =====

export interface HealthMetadata {
  // 영양정보
  nutritionInfo?: NutritionInfo[];

  // 기능성
  functionDescription: string;

  // 섭취 방법
  intakeMethod: string;
  dailyDosage?: string;

  // 주의사항
  caution: string;

  // 알레르기 정보
  allergyInfo?: AllergyType[];

  // 유통기한
  expirationDate: Date | string;

  // 보관 방법
  storageMethod?: StorageMethod;

  // 제조/수입
  manufacturer?: string;
  importer?: string;

  // 인증
  certifications?: HealthCertification[];

  // 카테고리
  healthCategory: HealthCategory;

  // 대상 그룹
  targetGroup?: TargetGroup[];

  // 제형
  form?: ProductForm;

  // 섭취량
  servingSize?: string;
  servingsPerContainer?: number;
}

// ===== Enums =====

export type AllergyType =
  | 'milk'
  | 'egg'
  | 'peanut'
  | 'soybean'
  | 'wheat'
  | 'buckwheat'
  | 'shellfish'
  | 'crab'
  | 'shrimp'
  | 'pork'
  | 'beef'
  | 'chicken'
  | 'squid'
  | 'fish'
  | 'walnut'
  | 'pine_nut'
  | 'sulfites';

export type StorageMethod =
  | 'room_temp'
  | 'refrigerated'
  | 'frozen'
  | 'dark_place';

export type HealthCertification =
  | 'gmp'
  | 'haccp'
  | 'organic'
  | 'halal'
  | 'kosher'
  | 'vegan'
  | 'iso';

export type HealthCategory =
  | 'vitamin'
  | 'mineral'
  | 'omega'
  | 'probiotics'
  | 'antioxidant'
  | 'joint'
  | 'eye'
  | 'liver'
  | 'immune'
  | 'energy'
  | 'digestion'
  | 'skin_health'
  | 'weight'
  | 'heart'
  | 'brain'
  | 'sleep'
  | 'general';

export type TargetGroup =
  | 'all'
  | 'child'
  | 'teen'
  | 'adult'
  | 'senior'
  | 'pregnant'
  | 'lactating'
  | 'men'
  | 'women';

export type ProductForm =
  | 'tablet'
  | 'capsule'
  | 'powder'
  | 'liquid'
  | 'gummy'
  | 'chewable'
  | 'softgel'
  | 'granule';

// ===== Filter Types =====

export interface HealthFilters {
  healthCategory?: HealthCategory;
  targetGroup?: TargetGroup[];
  certifications?: HealthCertification[];
  form?: ProductForm;
  allergyFree?: AllergyType[];
  search?: string;
}

// ===== Product Type Guard =====

export function isHealthProduct(product: any): product is { metadata: HealthMetadata } {
  return (
    product?.productType === 'HEALTH' ||
    product?.type === 'health' ||
    product?.metadata?.healthCategory !== undefined
  );
}

// ===== Validation Helpers =====

export function validateHealthMetadata(metadata: Partial<HealthMetadata>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!metadata.functionDescription) {
    errors.push('기능성 내용(functionDescription)은 필수입니다');
  }

  if (!metadata.intakeMethod) {
    errors.push('섭취 방법(intakeMethod)은 필수입니다');
  }

  if (!metadata.caution) {
    errors.push('주의사항(caution)은 필수입니다');
  }

  if (!metadata.expirationDate) {
    errors.push('유통기한(expirationDate)은 필수입니다');
  }

  if (!metadata.healthCategory) {
    errors.push('건강기능식품 카테고리(healthCategory)는 필수입니다');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function isExpirationNear(
  expirationDate: Date | string,
  warningDays: number = 90,
): boolean {
  const expDate = new Date(expirationDate);
  const now = new Date();
  const diffTime = expDate.getTime() - now.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays <= warningDays && diffDays > 0;
}

export function isExpired(expirationDate: Date | string): boolean {
  const expDate = new Date(expirationDate);
  const now = new Date();
  return expDate < now;
}
