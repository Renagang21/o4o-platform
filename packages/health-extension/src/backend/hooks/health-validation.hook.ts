/**
 * Health Validation Hooks
 *
 * Core Hook(before/after) 기반 건강기능식품 검증 규칙
 *
 * @package @o4o/health-extension
 */

import {
  type HealthMetadata,
  validateHealthMetadata,
  isExpired,
  isExpirationNear,
  isHealthProduct,
} from '../../types.js';

// ===== Hook Context Types =====

export interface HookContext<T = any> {
  data: T;
  user?: {
    id: string;
    role: string;
    sellerId?: string;
  };
  metadata?: Record<string, any>;
}

export interface HookResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  data?: any;
}

// ===== Before Offer Create Hook =====

/**
 * beforeOfferCreate Hook
 *
 * Health 제품 Offer 생성 전 검증:
 * - expirationDate 필수
 * - functionDescription 필수
 * - 유통기한 만료 제품 거부
 */
export async function beforeOfferCreate(
  context: HookContext<{ product: any; offer: any }>,
): Promise<HookResult> {
  const { product, offer } = context.data;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Health 제품인지 확인
  if (!isHealthProduct(product)) {
    return { success: true, errors: [], warnings: [] };
  }

  const metadata = product.metadata as HealthMetadata;

  // 1. 필수 필드 검증
  const validation = validateHealthMetadata(metadata);
  if (!validation.valid) {
    errors.push(...validation.errors);
  }

  // 2. 유통기한 검증
  if (metadata.expirationDate) {
    if (isExpired(metadata.expirationDate)) {
      errors.push('유통기한이 만료된 제품은 Offer를 생성할 수 없습니다');
    } else if (isExpirationNear(metadata.expirationDate, 30)) {
      warnings.push('유통기한이 30일 이내로 임박한 제품입니다');
    }
  } else {
    errors.push('Health 제품은 유통기한(expirationDate) 없이 Offer를 생성할 수 없습니다');
  }

  // 3. 기능성 검증
  if (!metadata.functionDescription) {
    errors.push('Health 제품은 기능성 내용(functionDescription) 없이 Offer를 생성할 수 없습니다');
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
  };
}

// ===== After Offer Create Hook =====

/**
 * afterOfferCreate Hook
 *
 * Offer 생성 후 처리:
 * - 로그 기록
 * - 알림 발송 (필요시)
 */
export async function afterOfferCreate(
  context: HookContext<{ product: any; offer: any }>,
): Promise<HookResult> {
  const { product, offer } = context.data;

  if (!isHealthProduct(product)) {
    return { success: true, errors: [], warnings: [] };
  }

  // 로그 기록
  console.log(`[health-extension] Health Offer created: ${offer.id}`);

  // 유통기한 임박 경고 알림 (placeholder)
  const metadata = product.metadata as HealthMetadata;
  if (metadata.expirationDate && isExpirationNear(metadata.expirationDate, 90)) {
    console.log(`[health-extension] Warning: Product ${product.id} expiration is near`);
  }

  return {
    success: true,
    errors: [],
    warnings: [],
  };
}

// ===== Before Listing Create Hook =====

/**
 * beforeListingCreate Hook
 *
 * Health 제품 Listing 생성 전 검증:
 * - Listing 가능 (PHARMACEUTICAL과 다름)
 * - 유통기한 임박 경고
 */
export async function beforeListingCreate(
  context: HookContext<{ product: any; listing: any }>,
): Promise<HookResult> {
  const { product, listing } = context.data;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isHealthProduct(product)) {
    return { success: true, errors: [], warnings: [] };
  }

  const metadata = product.metadata as HealthMetadata;

  // 1. Health 제품은 Listing 가능 (PHARMACEUTICAL과 차이점)
  // - 별도 제한 없음

  // 2. 유통기한 임박 경고
  if (metadata.expirationDate && isExpirationNear(metadata.expirationDate, 90)) {
    warnings.push('유통기한이 90일 이내로 임박한 제품입니다. 판매 전략을 고려해주세요.');
  }

  // 3. 만료된 제품 거부
  if (metadata.expirationDate && isExpired(metadata.expirationDate)) {
    errors.push('유통기한이 만료된 제품은 Listing할 수 없습니다');
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
  };
}

// ===== After Listing Create Hook =====

export async function afterListingCreate(
  context: HookContext<{ product: any; listing: any }>,
): Promise<HookResult> {
  const { product, listing } = context.data;

  if (!isHealthProduct(product)) {
    return { success: true, errors: [], warnings: [] };
  }

  console.log(`[health-extension] Health Listing created: ${listing.id}`);

  return {
    success: true,
    errors: [],
    warnings: [],
  };
}

// ===== Before Order Create Hook =====

/**
 * beforeOrderCreate Hook
 *
 * Health 제품 주문 생성 전 검증:
 * - 일반 Seller 주문 가능
 * - SellerType 제한 없음
 */
export async function beforeOrderCreate(
  context: HookContext<{ offer: any; order: any }>,
): Promise<HookResult> {
  const { offer, order } = context.data;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Health 제품은 SellerType 제한 없이 주문 가능
  // (PHARMACEUTICAL과 다름)

  // 유통기한 검증은 Offer에서 이미 처리됨
  // 추가 검증 필요시 여기에 구현

  return {
    success: errors.length === 0,
    errors,
    warnings,
  };
}

// ===== After Order Create Hook =====

export async function afterOrderCreate(
  context: HookContext<{ offer: any; order: any }>,
): Promise<HookResult> {
  const { offer, order } = context.data;

  console.log(`[health-extension] Health Order created: ${order.id}`);

  return {
    success: true,
    errors: [],
    warnings: [],
  };
}

// ===== Export All Hooks =====

export const healthValidationHooks = {
  beforeOfferCreate,
  afterOfferCreate,
  beforeListingCreate,
  afterListingCreate,
  beforeOrderCreate,
  afterOrderCreate,
};

export default healthValidationHooks;
