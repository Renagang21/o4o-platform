/**
 * Cache service type definitions
 */

import { Redis } from 'ioredis';

export interface PricingResultCache {
  enabled?: boolean;
  degradationLevel?: string;
  fallbackData?: Record<string, unknown>;
  staticContent?: string;
  fallbackUrl?: string;
  readOnlyMode?: boolean;
  essentialOnly?: boolean;
  disabledFeatures?: string[];
  metadata?: Record<string, string | number | boolean | string[]>;
}

export interface CacheServiceInterface {
  redis: Redis;
  isEnabled: boolean;
  cachePricingResult(cacheKey: string, result: PricingResultCache, ttlSeconds?: number): Promise<void>;
  getCachedPricingResult(cacheKey: string): Promise<PricingResultCache | null>;
  invalidateProductPricing(productId: string): Promise<void>;
  invalidateUserPricing(userId: string): Promise<void>;
  invalidatePolicyPricing(policyId: string): Promise<void>;
  invalidateAllPricing(): Promise<void>;
  close(): Promise<void>;
}