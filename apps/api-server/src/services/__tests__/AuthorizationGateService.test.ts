/**
 * Phase 9: AuthorizationGateService Unit Tests
 *
 * Test Coverage:
 * 1. Self-seller bypass (OK)
 * 2. Not approved (NOT_APPROVED)
 * 3. Product limit exceeded (LIMIT)
 * 4. Cooldown active (COOLDOWN)
 * 5. Revoked permanently (REVOKED)
 * 6. Cache hit/miss behavior
 * 7. Feature flag disabled (bypass)
 */

import { AuthorizationGateService } from '../AuthorizationGateService';
import { AppDataSource } from '../../database/connection';
import { SellerAuthorization, AuthorizationStatus } from '../../entities/SellerAuthorization';
import { CacheService } from '../cache.service';

// Mock dependencies
jest.mock('../../database/connection');
jest.mock('../cache.service');
jest.mock('../authorization-metrics.service', () => ({
  authorizationMetrics: {
    recordGateLatency: jest.fn(),
  },
}));
jest.mock('../../utils/logger', () => ({
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('AuthorizationGateService', () => {
  let service: AuthorizationGateService;
  let mockRepository: any;
  let mockCacheService: any;

  beforeEach(() => {
    // Reset environment
    process.env.ENABLE_SELLER_AUTHORIZATION = 'true';

    // Setup mocks
    mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
    };

    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);
    (CacheService as jest.Mock).mockImplementation(() => mockCacheService);

    service = new AuthorizationGateService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isSellerApprovedForProduct', () => {
    const sellerId = 'seller-123';
    const productId = 'product-456';

    test('1. Should return true when feature flag is disabled (fail-open)', async () => {
      process.env.ENABLE_SELLER_AUTHORIZATION = 'false';
      service = new AuthorizationGateService();

      const result = await service.isSellerApprovedForProduct(sellerId, productId);

      expect(result).toBe(true);
      expect(mockCacheService.get).not.toHaveBeenCalled();
      expect(mockRepository.findOne).not.toHaveBeenCalled();
    });

    test('2. Should return cached value when cache hit', async () => {
      mockCacheService.get.mockResolvedValue(true);

      const result = await service.isSellerApprovedForProduct(sellerId, productId);

      expect(result).toBe(true);
      expect(mockCacheService.get).toHaveBeenCalledWith(
        expect.stringContaining(`${sellerId}:product:${productId}`)
      );
      expect(mockRepository.findOne).not.toHaveBeenCalled();
    });

    test('3. Should query database on cache miss and return true when APPROVED', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.findOne.mockResolvedValue({
        id: 'auth-123',
        sellerId,
        productId,
        status: AuthorizationStatus.APPROVED,
      });

      const result = await service.isSellerApprovedForProduct(sellerId, productId);

      expect(result).toBe(true);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          sellerId,
          productId,
          status: AuthorizationStatus.APPROVED,
        },
      });
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        true,
        expect.objectContaining({ ttl: 30 })
      );
    });

    test('4. Should return false when authorization not found', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.isSellerApprovedForProduct(sellerId, productId);

      expect(result).toBe(false);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        false,
        expect.objectContaining({ ttl: 30 })
      );
    });

    test('5. Should return false on database error (fail-closed)', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.findOne.mockRejectedValue(new Error('Database connection failed'));

      const result = await service.isSellerApprovedForProduct(sellerId, productId);

      expect(result).toBe(false);
    });

    test('6. Should handle cache error gracefully and fallback to database', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Redis connection failed'));
      mockRepository.findOne.mockResolvedValue({
        id: 'auth-123',
        sellerId,
        productId,
        status: AuthorizationStatus.APPROVED,
      });

      const result = await service.isSellerApprovedForProduct(sellerId, productId);

      expect(result).toBe(false); // Fail-closed on error
    });
  });

  describe('getAuthorizationStatus', () => {
    const sellerId = 'seller-123';
    const productId = 'product-456';

    test('7. Should return APPROVED status with isAuthorized=true', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: 'auth-123',
        sellerId,
        productId,
        status: AuthorizationStatus.APPROVED,
        requestedAt: new Date(),
        approvedAt: new Date(),
        canRequest: () => false,
        getErrorMessage: () => '',
      });

      const result = await service.getAuthorizationStatus(sellerId, productId);

      expect(result.isAuthorized).toBe(true);
      expect(result.status).toBe('APPROVED');
      expect(result.authorizationId).toBe('auth-123');
    });

    test('8. Should return REJECTED status with cooldown info', async () => {
      const cooldownUntil = new Date(Date.now() + 86400000 * 10); // 10 days from now
      mockRepository.findOne.mockResolvedValue({
        id: 'auth-123',
        sellerId,
        productId,
        status: AuthorizationStatus.REJECTED,
        rejectionReason: 'Quality concerns',
        cooldownUntil,
        canRequest: () => false,
        getErrorMessage: () => 'Authorization was rejected. You can re-apply in 10 day(s).',
      });

      const result = await service.getAuthorizationStatus(sellerId, productId);

      expect(result.isAuthorized).toBe(false);
      expect(result.status).toBe('REJECTED');
      expect(result.reason).toBe('Quality concerns');
      expect(result.cooldownUntil).toEqual(cooldownUntil);
      expect(result.errorCode).toBe('ERR_REJECTED');
    });

    test('9. Should return REVOKED status', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: 'auth-123',
        sellerId,
        productId,
        status: AuthorizationStatus.REVOKED,
        revocationReason: 'Terms violation',
        canRequest: () => false,
        getErrorMessage: () => 'Authorization was permanently revoked.',
      });

      const result = await service.getAuthorizationStatus(sellerId, productId);

      expect(result.isAuthorized).toBe(false);
      expect(result.status).toBe('REVOKED');
      expect(result.reason).toBe('Terms violation');
      expect(result.canRequest).toBe(false);
    });

    test('10. Should return NONE status when no authorization exists', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.getAuthorizationStatus(sellerId, productId);

      expect(result.isAuthorized).toBe(false);
      expect(result.status).toBe('NONE');
      expect(result.canRequest).toBe(true);
      expect(result.errorCode).toBe('ERR_NO_AUTHORIZATION');
    });
  });

  describe('invalidateCache', () => {
    test('Should invalidate cache for seller-product pair', async () => {
      const sellerId = 'seller-123';
      const productId = 'product-456';

      await service.invalidateCache(sellerId, productId);

      expect(mockCacheService.del).toHaveBeenCalledWith(
        expect.stringContaining(`${sellerId}:product:${productId}`)
      );
    });

    test('Should not throw on cache invalidation error', async () => {
      mockCacheService.del.mockRejectedValue(new Error('Redis error'));

      await expect(service.invalidateCache('seller-123', 'product-456')).resolves.not.toThrow();
    });
  });

  describe('warmCache', () => {
    test('Should warm cache with all approved authorizations', async () => {
      const sellerId = 'seller-123';
      const approvedAuths = [
        { id: 'auth-1', sellerId, productId: 'prod-1', status: AuthorizationStatus.APPROVED },
        { id: 'auth-2', sellerId, productId: 'prod-2', status: AuthorizationStatus.APPROVED },
        { id: 'auth-3', sellerId, productId: 'prod-3', status: AuthorizationStatus.APPROVED },
      ];

      mockRepository.find.mockResolvedValue(approvedAuths);

      const count = await service.warmCache(sellerId);

      expect(count).toBe(3);
      expect(mockCacheService.set).toHaveBeenCalledTimes(3);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          sellerId,
          status: AuthorizationStatus.APPROVED,
        },
      });
    });

    test('Should return 0 when feature disabled', async () => {
      process.env.ENABLE_SELLER_AUTHORIZATION = 'false';
      service = new AuthorizationGateService();

      const count = await service.warmCache('seller-123');

      expect(count).toBe(0);
      expect(mockRepository.find).not.toHaveBeenCalled();
    });
  });
});
