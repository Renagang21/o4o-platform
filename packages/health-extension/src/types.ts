/**
 * Health Extension Types
 * @package @o4o/health-extension
 */

export interface NutritionInfo {
  name: string;
  amount: string;
  unit: string;
  dailyValue?: number;
}

export interface HealthMetadata {
  nutritionInfo?: NutritionInfo[];
  functionDescription: string;
  intakeMethod: string;
  dailyDosage?: string;
  caution: string;
  allergyInfo?: AllergyType[];
  expirationDate: Date | string;
  storageMethod?: StorageMethod;
  manufacturer?: string;
  importer?: string;
  certifications?: HealthCertification[];
  healthCategory: HealthCategory;
  targetGroup?: TargetGroup[];
  form?: ProductForm;
  servingSize?: string;
  servingsPerContainer?: number;
}

export type AllergyType =
  | 'milk' | 'egg' | 'peanut' | 'soybean' | 'wheat' | 'buckwheat'
  | 'shellfish' | 'crab' | 'shrimp' | 'pork' | 'beef' | 'chicken'
  | 'squid' | 'fish' | 'walnut' | 'pine_nut' | 'sulfites';

export type StorageMethod = 'room_temp' | 'refrigerated' | 'frozen' | 'dark_place';
export type HealthCertification = 'gmp' | 'haccp' | 'organic' | 'halal' | 'kosher' | 'vegan' | 'iso';
export type HealthCategory =
  | 'vitamin' | 'mineral' | 'omega' | 'probiotics' | 'antioxidant'
  | 'joint' | 'eye' | 'liver' | 'immune' | 'energy' | 'digestion'
  | 'skin_health' | 'weight' | 'heart' | 'brain' | 'sleep' | 'general';
export type TargetGroup = 'all' | 'child' | 'teen' | 'adult' | 'senior' | 'pregnant' | 'lactating' | 'men' | 'women';
export type ProductForm = 'tablet' | 'capsule' | 'powder' | 'liquid' | 'gummy' | 'chewable' | 'softgel' | 'granule';

export interface HealthFilters {
  healthCategory?: HealthCategory;
  targetGroup?: TargetGroup[];
  certifications?: HealthCertification[];
  form?: ProductForm;
  allergyFree?: AllergyType[];
  search?: string;
}

export interface HealthProductBase {
  id: string;
  name?: string;
  productType?: string;
  metadata: HealthMetadata;
}

export function isHealthProduct(product: any): product is HealthProductBase {
  return product?.productType === 'HEALTH' || product?.type === 'health' || product?.metadata?.healthCategory !== undefined;
}

export function validateHealthMetadata(metadata: Partial<HealthMetadata>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!metadata.functionDescription) errors.push('기능성 내용(functionDescription)은 필수입니다');
  if (!metadata.intakeMethod) errors.push('섭취 방법(intakeMethod)은 필수입니다');
  if (!metadata.caution) errors.push('주의사항(caution)은 필수입니다');
  if (!metadata.expirationDate) errors.push('유통기한(expirationDate)은 필수입니다');
  if (!metadata.healthCategory) errors.push('건강기능식품 카테고리(healthCategory)는 필수입니다');
  return { valid: errors.length === 0, errors };
}

export function isExpirationNear(expirationDate: Date | string, warningDays = 90): boolean {
  const expDate = new Date(expirationDate);
  const diffDays = (expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return diffDays <= warningDays && diffDays > 0;
}

export function isExpired(expirationDate: Date | string): boolean {
  return new Date(expirationDate) < new Date();
}
