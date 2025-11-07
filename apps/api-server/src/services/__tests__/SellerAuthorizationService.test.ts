/**
 * Phase 9: SellerAuthorizationService Unit Tests
 *
 * Test Coverage:
 * 1. Request authorization - duplicate check
 * 2. Request authorization - product limit (10)
 * 3. Request authorization - cooldown enforcement
 * 4. Request authorization - revoked product (permanent block)
 * 5. Approve authorization - success
 * 6. Approve authorization - invalid status transition
 * 7. Reject authorization - cooldown calculation
 * 8. Reject authorization - reason validation
 * 9. Revoke authorization - permanent block
 * 10. Cancel authorization - seller ownership check
 */

import { SellerAuthorizationService } from '../SellerAuthorizationService';
import { AppDataSource } from '../../database/connection';
import { SellerAuthorization, AuthorizationStatus } from '../../entities/SellerAuthorization';
import { SellerAuthorizationAuditLog } from '../../entities/SellerAuthorizationAuditLog';
import { authorizationGateService } from '../AuthorizationGateService';
import { authorizationMetrics } from '../authorization-metrics.service';

// Mock dependencies
jest.mock('../../database/connection');
jest.mock('../AuthorizationGateService');
jest.mock('../authorization-metrics.service');
jest.mock('../../utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('SellerAuthorizationService', () => {
  let service: SellerAuthorizationService;
  let mockAuthRepo: any;
  let mockAuditRepo: any;

  beforeEach(() => {
    process.env.ENABLE_SELLER_AUTHORIZATION = 'true';
    process.env.SELLER_AUTHORIZATION_LIMIT = '10';
    process.env.SELLER_AUTHORIZATION_COOLDOWN_DAYS = '30';

    mockAuthRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      count: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    mockAuditRepo = {
      save: jest.fn((entity) => Promise.resolve(entity)),
      findAndCount: jest.fn(),
    };

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entityName) => {
      if (entityName === SellerAuthorization || entityName === 'SellerAuthorization') {
        return mockAuthRepo;
      }
      if (entityName === SellerAuthorizationAuditLog || entityName === 'SellerAuthorizationAuditLog') {
        return mockAuditRepo;
      }
      return {};
    });

    service = new SellerAuthorizationService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestAuthorization', () => {
    const input = {
      sellerId: 'seller-123',
      productId: 'product-456',
      supplierId: 'supplier-789',
      metadata: { businessJustification: 'Expanding product line' },
    };

    test('1. Should throw error when feature is disabled', async () => {
      process.env.ENABLE_SELLER_AUTHORIZATION = 'false';
      service = new SellerAuthorizationService();

      await expect(service.requestAuthorization(input)).rejects.toThrow('FEATURE_NOT_ENABLED');
    });

    test('2. Should throw error when authorization is REVOKED (permanent block)', async () => {
      mockAuthRepo.findOne.mockResolvedValue({
        id: 'auth-123',
        status: AuthorizationStatus.REVOKED,
      });

      await expect(service.requestAuthorization(input)).rejects.toThrow('ERR_AUTHORIZATION_REVOKED');
      expect(authorizationMetrics.incrementRequestCounter).toHaveBeenCalledWith('request', 'error');
    });

    test('3. Should throw error when in cooldown period', async () => {
      const cooldownUntil = new Date(Date.now() + 86400000 * 5); // 5 days from now
      mockAuthRepo.findOne.mockResolvedValue({
        id: 'auth-123',
        status: AuthorizationStatus.REJECTED,
        cooldownUntil,
        isInCooldown: () => true,
        getCooldownDaysRemaining: () => 5,
        rejectionReason: 'Quality concerns',
      });

      await expect(service.requestAuthorization(input)).rejects.toThrow('ERR_COOLDOWN_ACTIVE');
      expect(authorizationMetrics.incrementCooldownBlock).toHaveBeenCalled();
    });

    test('4. Should throw error when product limit reached (10 products)', async () => {
      mockAuthRepo.findOne.mockResolvedValue(null); // No existing authorization
      mockAuthRepo.count.mockResolvedValue(10); // Already at limit

      await expect(service.requestAuthorization(input)).rejects.toThrow('ERR_PRODUCT_LIMIT_REACHED');
      expect(authorizationMetrics.incrementLimitRejection).toHaveBeenCalled();
    });

    test('5. Should throw error when already APPROVED', async () => {
      mockAuthRepo.findOne.mockResolvedValue({
        id: 'auth-123',
        status: AuthorizationStatus.APPROVED,
      });

      await expect(service.requestAuthorization(input)).rejects.toThrow('ERR_ALREADY_APPROVED');
    });

    test('6. Should throw error when already REQUESTED (pending)', async () => {
      mockAuthRepo.findOne.mockResolvedValue({
        id: 'auth-123',
        status: AuthorizationStatus.REQUESTED,
      });

      await expect(service.requestAuthorization(input)).rejects.toThrow('ERR_ALREADY_APPLIED');
    });

    test('7. Should create new authorization when no existing record', async () => {
      mockAuthRepo.findOne.mockResolvedValue(null);
      mockAuthRepo.count.mockResolvedValue(5); // Below limit

      const result = await service.requestAuthorization(input);

      expect(mockAuthRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sellerId: input.sellerId,
          productId: input.productId,
          supplierId: input.supplierId,
          status: AuthorizationStatus.REQUESTED,
          metadata: input.metadata,
        })
      );
      expect(mockAuthRepo.save).toHaveBeenCalled();
      expect(mockAuditRepo.save).toHaveBeenCalled();
      expect(authorizationMetrics.incrementRequestCounter).toHaveBeenCalledWith('request', 'success');
    });

    test('8. Should allow re-request when REJECTED and cooldown expired', async () => {
      const existingAuth = {
        id: 'auth-123',
        status: AuthorizationStatus.REJECTED,
        cooldownUntil: new Date(Date.now() - 86400000), // Expired yesterday
        isInCooldown: () => false,
        requestedAt: new Date(),
        metadata: {},
      };
      mockAuthRepo.findOne.mockResolvedValue(existingAuth);

      const result = await service.requestAuthorization(input);

      expect(mockAuthRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AuthorizationStatus.REQUESTED,
          metadata: input.metadata,
        })
      );
      expect(authorizationMetrics.incrementRequestCounter).toHaveBeenCalledWith('request', 'success');
    });
  });

  describe('approveAuthorization', () => {
    test('9. Should approve authorization successfully', async () => {
      const authorization = {
        id: 'auth-123',
        sellerId: 'seller-123',
        productId: 'product-456',
        status: AuthorizationStatus.REQUESTED,
        approve: jest.fn(),
        expiresAt: null,
      };
      mockAuthRepo.findOne.mockResolvedValue(authorization);
      mockAuthRepo.count.mockResolvedValue(5); // Below limit

      const result = await service.approveAuthorization({
        authorizationId: 'auth-123',
        approvedBy: 'supplier-admin-123',
      });

      expect(authorization.approve).toHaveBeenCalledWith('supplier-admin-123');
      expect(mockAuthRepo.save).toHaveBeenCalled();
      expect(mockAuditRepo.save).toHaveBeenCalled();
      expect(authorizationGateService.invalidateCache).toHaveBeenCalledWith('seller-123', 'product-456');
      expect(authorizationMetrics.incrementRequestCounter).toHaveBeenCalledWith('approve', 'success');
    });

    test('10. Should throw error when authorization not found', async () => {
      mockAuthRepo.findOne.mockResolvedValue(null);

      await expect(
        service.approveAuthorization({
          authorizationId: 'nonexistent',
          approvedBy: 'supplier-admin-123',
        })
      ).rejects.toThrow('ERR_AUTHORIZATION_NOT_FOUND');
    });

    test('11. Should throw error when status is not REQUESTED', async () => {
      mockAuthRepo.findOne.mockResolvedValue({
        id: 'auth-123',
        status: AuthorizationStatus.APPROVED,
      });

      await expect(
        service.approveAuthorization({
          authorizationId: 'auth-123',
          approvedBy: 'supplier-admin-123',
        })
      ).rejects.toThrow('ERR_INVALID_STATUS');
    });

    test('12. Should throw error when seller at product limit', async () => {
      mockAuthRepo.findOne.mockResolvedValue({
        id: 'auth-123',
        sellerId: 'seller-123',
        status: AuthorizationStatus.REQUESTED,
      });
      mockAuthRepo.count.mockResolvedValue(10); // At limit

      await expect(
        service.approveAuthorization({
          authorizationId: 'auth-123',
          approvedBy: 'supplier-admin-123',
        })
      ).rejects.toThrow('ERR_PRODUCT_LIMIT_REACHED');
    });
  });

  describe('rejectAuthorization', () => {
    test('13. Should reject authorization with 30-day cooldown', async () => {
      const authorization = {
        id: 'auth-123',
        sellerId: 'seller-123',
        productId: 'product-456',
        status: AuthorizationStatus.REQUESTED,
        reject: jest.fn(),
        cooldownUntil: null,
      };
      mockAuthRepo.findOne.mockResolvedValue(authorization);

      const result = await service.rejectAuthorization({
        authorizationId: 'auth-123',
        rejectedBy: 'supplier-admin-123',
        reason: 'Quality standards not met',
      });

      expect(authorization.reject).toHaveBeenCalledWith(
        'supplier-admin-123',
        'Quality standards not met',
        30 // Default cooldown days
      );
      expect(mockAuthRepo.save).toHaveBeenCalled();
      expect(mockAuditRepo.save).toHaveBeenCalled();
      expect(authorizationGateService.invalidateCache).toHaveBeenCalled();
    });

    test('14. Should throw error when reason is too short', async () => {
      mockAuthRepo.findOne.mockResolvedValue({
        id: 'auth-123',
        status: AuthorizationStatus.REQUESTED,
      });

      await expect(
        service.rejectAuthorization({
          authorizationId: 'auth-123',
          rejectedBy: 'supplier-admin-123',
          reason: 'Too short', // Less than 10 chars
        })
      ).rejects.toThrow('ERR_REASON_REQUIRED');
    });

    test('15. Should allow custom cooldown days', async () => {
      const authorization = {
        id: 'auth-123',
        sellerId: 'seller-123',
        productId: 'product-456',
        status: AuthorizationStatus.REQUESTED,
        reject: jest.fn(),
      };
      mockAuthRepo.findOne.mockResolvedValue(authorization);

      await service.rejectAuthorization({
        authorizationId: 'auth-123',
        rejectedBy: 'supplier-admin-123',
        reason: 'Custom cooldown period',
        cooldownDays: 60, // Custom 60 days
      });

      expect(authorization.reject).toHaveBeenCalledWith(
        'supplier-admin-123',
        'Custom cooldown period',
        60
      );
    });
  });

  describe('revokeAuthorization', () => {
    test('16. Should revoke authorization permanently', async () => {
      const authorization = {
        id: 'auth-123',
        sellerId: 'seller-123',
        productId: 'product-456',
        status: AuthorizationStatus.APPROVED,
        revoke: jest.fn(),
      };
      mockAuthRepo.findOne.mockResolvedValue(authorization);

      const result = await service.revokeAuthorization({
        authorizationId: 'auth-123',
        revokedBy: 'supplier-admin-123',
        reason: 'Terms of service violation',
      });

      expect(authorization.revoke).toHaveBeenCalledWith('supplier-admin-123', 'Terms of service violation');
      expect(mockAuthRepo.save).toHaveBeenCalled();
      expect(mockAuditRepo.save).toHaveBeenCalled();
      expect(authorizationGateService.invalidateCache).toHaveBeenCalled();
    });

    test('17. Should throw error when status is not APPROVED', async () => {
      mockAuthRepo.findOne.mockResolvedValue({
        id: 'auth-123',
        status: AuthorizationStatus.REQUESTED,
      });

      await expect(
        service.revokeAuthorization({
          authorizationId: 'auth-123',
          revokedBy: 'supplier-admin-123',
          reason: 'Cannot revoke non-approved',
        })
      ).rejects.toThrow('ERR_INVALID_STATUS');
    });
  });

  describe('cancelAuthorization', () => {
    test('18. Should cancel authorization (seller-initiated)', async () => {
      const authorization = {
        id: 'auth-123',
        sellerId: 'seller-123',
        productId: 'product-456',
        status: AuthorizationStatus.REQUESTED,
        cancel: jest.fn(),
      };
      mockAuthRepo.findOne.mockResolvedValue(authorization);

      const result = await service.cancelAuthorization('auth-123', 'seller-123');

      expect(authorization.cancel).toHaveBeenCalled();
      expect(mockAuthRepo.save).toHaveBeenCalled();
      expect(mockAuditRepo.save).toHaveBeenCalled();
      expect(authorizationGateService.invalidateCache).toHaveBeenCalled();
    });

    test('19. Should throw error when seller does not own authorization', async () => {
      mockAuthRepo.findOne.mockResolvedValue(null); // Not found for this seller

      await expect(service.cancelAuthorization('auth-123', 'wrong-seller-456')).rejects.toThrow(
        'ERR_AUTHORIZATION_NOT_FOUND'
      );
    });

    test('20. Should throw error when status is not REQUESTED', async () => {
      const authorization = {
        id: 'auth-123',
        sellerId: 'seller-123',
        status: AuthorizationStatus.APPROVED,
        cancel: jest.fn(() => {
          throw new Error('Can only cancel REQUESTED authorizations');
        }),
      };
      mockAuthRepo.findOne.mockResolvedValue(authorization);

      await expect(service.cancelAuthorization('auth-123', 'seller-123')).rejects.toThrow(
        'Can only cancel REQUESTED authorizations'
      );
    });
  });

  describe('getSellerLimits', () => {
    test('Should return seller limits and active cooldowns', async () => {
      mockAuthRepo.count.mockResolvedValue(7); // 7 approved products
      mockAuthRepo.find.mockResolvedValue([
        {
          productId: 'prod-1',
          status: AuthorizationStatus.REJECTED,
          cooldownUntil: new Date(Date.now() + 86400000 * 5), // 5 days
          isInCooldown: () => true,
          getCooldownDaysRemaining: () => 5,
          product: { name: 'Product 1' },
        },
        {
          productId: 'prod-2',
          status: AuthorizationStatus.REJECTED,
          cooldownUntil: new Date(Date.now() - 86400000), // Expired
          isInCooldown: () => false,
          getCooldownDaysRemaining: () => 0,
          product: { name: 'Product 2' },
        },
      ]);

      const result = await service.getSellerLimits('seller-123');

      expect(result.currentCount).toBe(7);
      expect(result.maxLimit).toBe(10);
      expect(result.remainingSlots).toBe(3);
      expect(result.cooldowns).toHaveLength(1); // Only active cooldown
      expect(result.cooldowns[0].productId).toBe('prod-1');
      expect(result.cooldowns[0].daysRemaining).toBe(5);
    });
  });
});
