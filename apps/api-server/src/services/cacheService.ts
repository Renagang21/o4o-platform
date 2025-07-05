import Redis from 'ioredis';
import { PricingResult } from './pricingService';

export class CacheService {
  private redis!: Redis;
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.REDIS_ENABLED === 'true';
    
    if (this.isEnabled) {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 5000,
        commandTimeout: 5000
      });

      this.redis.on('error', (error) => {
        console.error('Redis connection error:', error);
        this.isEnabled = false;
      });

      this.redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
        this.isEnabled = true;
      });
    }
  }

  /**
   * 가격 계산 결과를 캐시합니다.
   */
  async cachePricingResult(
    cacheKey: string, 
    result: PricingResult, 
    ttlSeconds: number = 300
  ): Promise<void> {
    if (!this.isEnabled) return;

    try {
      await this.redis.setex(
        `pricing:${cacheKey}`,
        ttlSeconds,
        JSON.stringify(result)
      );
    } catch (error) {
      console.warn('Failed to cache pricing result:', error);
    }
  }

  /**
   * 캐시된 가격 계산 결과를 조회합니다.
   */
  async getCachedPricingResult(cacheKey: string): Promise<PricingResult | null> {
    if (!this.isEnabled) return null;

    try {
      const cached = await this.redis.get(`pricing:${cacheKey}`);
      if (cached) {
        return JSON.parse(cached) as PricingResult;
      }
    } catch (error) {
      console.warn('Failed to get cached pricing result:', error);
    }

    return null;
  }

  /**
   * 상품별 가격 캐시를 무효화합니다.
   */
  async invalidateProductPricing(productId: string): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const pattern = `pricing:*:product:${productId}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.warn('Failed to invalidate product pricing cache:', error);
    }
  }

  /**
   * 사용자별 가격 캐시를 무효화합니다.
   */
  async invalidateUserPricing(userId: string): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const pattern = `pricing:*:user:${userId}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.warn('Failed to invalidate user pricing cache:', error);
    }
  }

  /**
   * 재고 예약을 캐시합니다.
   */
  async reserveInventory(
    productId: string, 
    quantity: number, 
    reservationId: string,
    ttlSeconds: number = 600
  ): Promise<boolean> {
    if (!this.isEnabled) return true;

    try {
      const key = `inventory:reserve:${productId}:${reservationId}`;
      const reserved = await this.redis.setex(key, ttlSeconds, quantity.toString());
      
      // 전체 예약 수량 업데이트
      const totalKey = `inventory:total_reserved:${productId}`;
      await this.redis.incrby(totalKey, quantity);
      await this.redis.expire(totalKey, ttlSeconds + 60);
      
      return reserved === 'OK';
    } catch (error) {
      console.warn('Failed to reserve inventory:', error);
      return true; // 캐시 실패 시 허용
    }
  }

  /**
   * 재고 예약을 해제합니다.
   */
  async releaseInventoryReservation(
    productId: string, 
    reservationId: string
  ): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const key = `inventory:reserve:${productId}:${reservationId}`;
      const quantityStr = await this.redis.get(key);
      
      if (quantityStr) {
        const quantity = parseInt(quantityStr);
        await this.redis.del(key);
        
        // 전체 예약 수량 감소
        const totalKey = `inventory:total_reserved:${productId}`;
        await this.redis.decrby(totalKey, quantity);
      }
    } catch (error) {
      console.warn('Failed to release inventory reservation:', error);
    }
  }

  /**
   * 상품의 총 예약된 수량을 조회합니다.
   */
  async getTotalReservedQuantity(productId: string): Promise<number> {
    if (!this.isEnabled) return 0;

    try {
      const totalKey = `inventory:total_reserved:${productId}`;
      const reservedStr = await this.redis.get(totalKey);
      return reservedStr ? parseInt(reservedStr) : 0;
    } catch (error) {
      console.warn('Failed to get total reserved quantity:', error);
      return 0;
    }
  }

  /**
   * 세션 기반 장바구니를 캐시합니다.
   */
  async cacheSessionCart(
    sessionId: string, 
    cartData: any, 
    ttlSeconds: number = 3600
  ): Promise<void> {
    if (!this.isEnabled) return;

    try {
      await this.redis.setex(
        `cart:session:${sessionId}`,
        ttlSeconds,
        JSON.stringify(cartData)
      );
    } catch (error) {
      console.warn('Failed to cache session cart:', error);
    }
  }

  /**
   * 세션 기반 장바구니를 조회합니다.
   */
  async getSessionCart(sessionId: string): Promise<any | null> {
    if (!this.isEnabled) return null;

    try {
      const cached = await this.redis.get(`cart:session:${sessionId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn('Failed to get session cart:', error);
      return null;
    }
  }

  /**
   * 결제 세션을 임시 저장합니다.
   */
  async cachePaymentSession(
    sessionId: string, 
    paymentData: any, 
    ttlSeconds: number = 1800
  ): Promise<void> {
    if (!this.isEnabled) return;

    try {
      await this.redis.setex(
        `payment:session:${sessionId}`,
        ttlSeconds,
        JSON.stringify(paymentData)
      );
    } catch (error) {
      console.warn('Failed to cache payment session:', error);
    }
  }

  /**
   * 결제 세션을 조회합니다.
   */
  async getPaymentSession(sessionId: string): Promise<any | null> {
    if (!this.isEnabled) return null;

    try {
      const cached = await this.redis.get(`payment:session:${sessionId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn('Failed to get payment session:', error);
      return null;
    }
  }

  /**
   * 결제 중복 요청을 방지합니다.
   */
  async preventDuplicatePayment(
    paymentKey: string, 
    ttlSeconds: number = 60
  ): Promise<boolean> {
    if (!this.isEnabled) return true;

    try {
      const key = `payment:lock:${paymentKey}`;
      const result = await this.redis.set(key, '1', 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch (error) {
      console.warn('Failed to set payment lock:', error);
      return true; // 캐시 실패 시 허용
    }
  }

  /**
   * 가격 계산 캐시 키를 생성합니다.
   */
  generatePricingCacheKey(
    productId: string,
    userRole: string,
    userId?: string,
    quantity?: number,
    additionalParams?: any
  ): string {
    const parts = [
      `product:${productId}`,
      `role:${userRole}`,
      userId ? `user:${userId}` : 'guest',
      quantity ? `qty:${quantity}` : 'qty:1'
    ];

    if (additionalParams) {
      const paramString = Object.keys(additionalParams)
        .sort()
        .map(key => `${key}:${additionalParams[key]}`)
        .join(':');
      parts.push(paramString);
    }

    return parts.join(':');
  }

  /**
   * 모든 캐시를 삭제합니다.
   */
  async clearAll(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      await this.redis.flushdb();
    } catch (error) {
      console.warn('Failed to clear all cache:', error);
    }
  }

  /**
   * 캐시 연결을 종료합니다.
   */
  async disconnect(): Promise<void> {
    if (this.isEnabled && this.redis) {
      await this.redis.disconnect();
    }
  }

  /**
   * 캐시 상태를 확인합니다.
   */
  async healthCheck(): Promise<{ status: string; message: string }> {
    if (!this.isEnabled) {
      return { status: 'disabled', message: 'Redis cache is disabled' };
    }

    try {
      await this.redis.ping();
      return { status: 'healthy', message: 'Redis cache is healthy' };
    } catch (error) {
      return { status: 'error', message: `Redis cache error: ${(error as Error).message}` };
    }
  }
}

// 싱글톤 인스턴스
export const cacheService = new CacheService();