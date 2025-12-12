/**
 * Health Validation Hooks
 * @package @o4o/health-extension
 */

import { type HealthMetadata, validateHealthMetadata, isExpired, isExpirationNear, isHealthProduct } from '../../types.js';

export interface HookContext<T = any> {
  data: T;
  user?: { id: string; role: string; sellerId?: string };
  metadata?: Record<string, any>;
}

export interface HookResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  data?: any;
}

export async function beforeOfferCreate(context: HookContext<{ product: any; offer: any }>): Promise<HookResult> {
  const { product } = context.data;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isHealthProduct(product)) return { success: true, errors: [], warnings: [] };

  const metadata = product.metadata as HealthMetadata;
  const validation = validateHealthMetadata(metadata);
  if (!validation.valid) errors.push(...validation.errors);

  if (metadata.expirationDate) {
    if (isExpired(metadata.expirationDate)) errors.push('유통기한이 만료된 제품은 Offer를 생성할 수 없습니다');
    else if (isExpirationNear(metadata.expirationDate, 30)) warnings.push('유통기한이 30일 이내로 임박한 제품입니다');
  } else {
    errors.push('Health 제품은 유통기한 없이 Offer를 생성할 수 없습니다');
  }

  if (!metadata.functionDescription) errors.push('Health 제품은 기능성 내용 없이 Offer를 생성할 수 없습니다');

  return { success: errors.length === 0, errors, warnings };
}

export async function afterOfferCreate(context: HookContext<{ product: any; offer: any }>): Promise<HookResult> {
  const { product, offer } = context.data;
  if (!isHealthProduct(product)) return { success: true, errors: [], warnings: [] };
  console.log(`[health-extension] Health Offer created: ${offer.id}`);
  const metadata = product.metadata as HealthMetadata;
  if (metadata.expirationDate && isExpirationNear(metadata.expirationDate, 90)) {
    console.log(`[health-extension] Warning: Product ${product.id} expiration is near`);
  }
  return { success: true, errors: [], warnings: [] };
}

export async function beforeListingCreate(context: HookContext<{ product: any; listing: any }>): Promise<HookResult> {
  const { product } = context.data;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isHealthProduct(product)) return { success: true, errors: [], warnings: [] };

  const metadata = product.metadata as HealthMetadata;
  if (metadata.expirationDate && isExpirationNear(metadata.expirationDate, 90)) {
    warnings.push('유통기한이 90일 이내로 임박한 제품입니다');
  }
  if (metadata.expirationDate && isExpired(metadata.expirationDate)) {
    errors.push('유통기한이 만료된 제품은 Listing할 수 없습니다');
  }

  return { success: errors.length === 0, errors, warnings };
}

export async function afterListingCreate(context: HookContext<{ product: any; listing: any }>): Promise<HookResult> {
  const { product, listing } = context.data;
  if (!isHealthProduct(product)) return { success: true, errors: [], warnings: [] };
  console.log(`[health-extension] Health Listing created: ${listing.id}`);
  return { success: true, errors: [], warnings: [] };
}

export async function beforeOrderCreate(context: HookContext<{ offer: any; order: any }>): Promise<HookResult> {
  return { success: true, errors: [], warnings: [] };
}

export async function afterOrderCreate(context: HookContext<{ offer: any; order: any }>): Promise<HookResult> {
  const { order } = context.data;
  console.log(`[health-extension] Health Order created: ${order.id}`);
  return { success: true, errors: [], warnings: [] };
}

export const healthValidationHooks = {
  beforeOfferCreate, afterOfferCreate, beforeListingCreate, afterListingCreate, beforeOrderCreate, afterOrderCreate,
};

export default healthValidationHooks;
