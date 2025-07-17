/**
 * Cache service type definitions
 */

import { Redis } from 'ioredis';

export interface CacheServiceInterface {
  redis: Redis;
  isEnabled: boolean;
  cachePricingResult(cacheKey: string, result: any, ttlSeconds?: number): Promise<void>;
  getCachedPricingResult(cacheKey: string): Promise<any | null>;
  invalidateProductPricing(productId: string): Promise<void>;
  invalidateUserPricing(userId: string): Promise<void>;
  invalidatePolicyPricing(policyId: string): Promise<void>;
  invalidateAllPricing(): Promise<void>;
  close(): Promise<void>;
}