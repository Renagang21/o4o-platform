/**
 * PolicyResolutionService Unit Tests
 * Phase 8-9: Simplified Policy Resolution
 *
 * After Phase 8-9, product/supplier level policies were removed.
 * resolve() now follows: default policy → safe_mode (null).
 *
 * Updated: 2026-02-14
 */

import { Repository } from 'typeorm';
import { PolicyResolutionService, PolicyResolutionContext, ResolvedPolicy } from '../PolicyResolutionService.js';
import { CommissionPolicy, PolicyType, PolicyStatus, CommissionType } from '../../entities/CommissionPolicy.js';
import { Product } from '../../entities/Product.js';
import { Supplier } from '../../entities/Supplier.js';
import { AppDataSource } from '../../database/connection.js';
import FeatureFlags from '../../config/featureFlags.js';
import metricsService from '../metrics.service.js';

// Mock dependencies
jest.mock('../../database/connection.js');
jest.mock('../../config/featureFlags.js');
jest.mock('../metrics.service.js');
jest.mock('../../utils/logger.js', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('PolicyResolutionService', () => {
  let service: PolicyResolutionService;
  let mockPolicyRepo: jest.Mocked<Repository<CommissionPolicy>>;

  // Test data factory
  const createPolicy = (overrides: Partial<CommissionPolicy> = {}): CommissionPolicy => {
    const policy = new CommissionPolicy();
    policy.id = overrides.id || 'policy-id';
    policy.policyCode = overrides.policyCode || 'TEST-POLICY';
    policy.name = overrides.name || 'Test Policy';
    policy.policyType = overrides.policyType || PolicyType.DEFAULT;
    policy.status = overrides.status || PolicyStatus.ACTIVE;
    policy.commissionType = overrides.commissionType || CommissionType.PERCENTAGE;
    policy.commissionRate = overrides.commissionRate ?? 10.0;
    policy.priority = overrides.priority ?? 0;
    policy.validFrom = overrides.validFrom;
    policy.validUntil = overrides.validUntil;
    policy.minCommission = overrides.minCommission;
    policy.maxCommission = overrides.maxCommission;
    policy.createdAt = new Date();
    policy.updatedAt = new Date();
    return policy;
  };

  const createContext = (overrides: Partial<PolicyResolutionContext> = {}): PolicyResolutionContext => ({
    productId: overrides.productId || 'product-id',
    supplierId: overrides.supplierId || 'supplier-id',
    partnerId: overrides.partnerId || 'partner-id',
    orderDate: overrides.orderDate || new Date('2025-11-07'),
    orderId: overrides.orderId,
    orderItemId: overrides.orderItemId
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockPolicyRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn()
    } as any;

    // Mock AppDataSource — only policyRepo is used in current flow
    (AppDataSource.getRepository as jest.Mock) = jest.fn(() => mockPolicyRepo);

    // Mock FeatureFlags - default enabled
    (FeatureFlags.isSupplierPolicyEnabled as jest.Mock) = jest.fn(() => true);

    // Mock metrics service
    (metricsService.recordPolicyResolution as jest.Mock) = jest.fn();

    service = new PolicyResolutionService();
  });

  describe('Default Policy Resolution', () => {
    it('should resolve to default policy', async () => {
      const defaultPolicy = createPolicy({
        id: 'pol_default',
        policyCode: 'DEFAULT-2025',
        policyType: PolicyType.DEFAULT,
        commissionRate: 10.0
      });

      mockPolicyRepo.findOne.mockResolvedValue(defaultPolicy);

      const result = await service.resolve(createContext());

      expect(result).not.toBeNull();
      expect(result!.resolutionLevel).toBe('default');
      expect(result!.policy.id).toBe('pol_default');
      expect(result!.policy.commissionRate).toBe(10.0);
    });

    it('should query policyRepo with correct where/order', async () => {
      const defaultPolicy = createPolicy({ policyType: PolicyType.DEFAULT });
      mockPolicyRepo.findOne.mockResolvedValue(defaultPolicy);

      await service.resolve(createContext());

      expect(mockPolicyRepo.findOne).toHaveBeenCalledWith({
        where: {
          policyType: PolicyType.DEFAULT,
          status: PolicyStatus.ACTIVE
        },
        order: {
          priority: 'DESC',
          createdAt: 'DESC'
        }
      });
    });

    it('should record default metrics on success', async () => {
      const defaultPolicy = createPolicy({ policyType: PolicyType.DEFAULT });
      mockPolicyRepo.findOne.mockResolvedValue(defaultPolicy);

      await service.resolve(createContext());

      expect(metricsService.recordPolicyResolution).toHaveBeenCalledWith({
        source: 'default',
        durationMs: expect.any(Number),
        success: true
      });
    });

    it('should include resolutionTimeMs in result', async () => {
      const defaultPolicy = createPolicy({ policyType: PolicyType.DEFAULT });
      mockPolicyRepo.findOne.mockResolvedValue(defaultPolicy);

      const result = await service.resolve(createContext());

      expect(result!.resolutionTimeMs).toBeGreaterThanOrEqual(0);
      expect(result!.resolutionTimeMs).toBeLessThan(100);
    });
  });

  describe('Safe Mode (No Policy Found)', () => {
    it('should return null when no default policy exists', async () => {
      mockPolicyRepo.findOne.mockResolvedValue(null);

      const result = await service.resolve(createContext());

      expect(result).toBeNull();
    });

    it('should return null when default policy is INACTIVE', async () => {
      const inactivePolicy = createPolicy({
        policyType: PolicyType.DEFAULT,
        status: PolicyStatus.INACTIVE
      });

      mockPolicyRepo.findOne.mockResolvedValue(inactivePolicy);

      const result = await service.resolve(createContext());

      expect(result).toBeNull();
    });

    it('should record safe_mode metrics', async () => {
      mockPolicyRepo.findOne.mockResolvedValue(null);

      await service.resolve(createContext());

      expect(metricsService.recordPolicyResolution).toHaveBeenCalledWith({
        source: 'safe_mode',
        durationMs: expect.any(Number),
        success: true
      });
    });
  });

  describe('Policy Date Validation', () => {
    it('should reject expired default policy and enter safe mode', async () => {
      const expiredPolicy = createPolicy({
        policyType: PolicyType.DEFAULT,
        commissionRate: 10.0,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2024-12-31')
      });

      mockPolicyRepo.findOne.mockResolvedValue(expiredPolicy);

      const result = await service.resolve(
        createContext({ orderDate: new Date('2025-11-07') })
      );

      expect(result).toBeNull();
    });

    it('should reject default policy where orderDate is before validFrom', async () => {
      const futurePolicy = createPolicy({
        policyType: PolicyType.DEFAULT,
        commissionRate: 10.0,
        validFrom: new Date('2025-12-01'),
        validUntil: new Date('2025-12-31')
      });

      mockPolicyRepo.findOne.mockResolvedValue(futurePolicy);

      const result = await service.resolve(
        createContext({ orderDate: new Date('2025-11-07') })
      );

      expect(result).toBeNull();
    });

    it('should accept default policy with no date constraints', async () => {
      const policy = createPolicy({
        policyType: PolicyType.DEFAULT,
        commissionRate: 10.0,
        validFrom: undefined,
        validUntil: undefined
      });

      mockPolicyRepo.findOne.mockResolvedValue(policy);

      const result = await service.resolve(createContext());

      expect(result).not.toBeNull();
      expect(result!.policy.commissionRate).toBe(10.0);
    });

    it('should accept default policy when orderDate is within valid range', async () => {
      const policy = createPolicy({
        policyType: PolicyType.DEFAULT,
        commissionRate: 10.0,
        validFrom: new Date('2025-01-01'),
        validUntil: new Date('2025-12-31')
      });

      mockPolicyRepo.findOne.mockResolvedValue(policy);

      const result = await service.resolve(
        createContext({ orderDate: new Date('2025-06-15') })
      );

      expect(result).not.toBeNull();
      expect(result!.resolutionLevel).toBe('default');
    });
  });

  describe('Feature Flag Disabled (Legacy Mode)', () => {
    beforeEach(() => {
      (FeatureFlags.isSupplierPolicyEnabled as jest.Mock).mockReturnValue(false);
    });

    it('should resolve to default policy in legacy mode', async () => {
      const defaultPolicy = createPolicy({
        id: 'pol_default',
        policyType: PolicyType.DEFAULT,
        commissionRate: 10.0
      });

      mockPolicyRepo.findOne.mockResolvedValue(defaultPolicy);

      const result = await service.resolve(createContext());

      expect(result).not.toBeNull();
      expect(result!.resolutionLevel).toBe('default');
      expect(result!.policy.commissionRate).toBe(10.0);
    });

    it('should return null in legacy mode when no default policy', async () => {
      mockPolicyRepo.findOne.mockResolvedValue(null);

      const result = await service.resolve(createContext());

      expect(result).toBeNull();
    });

    it('should record safe_mode metrics in legacy mode when no policy', async () => {
      mockPolicyRepo.findOne.mockResolvedValue(null);

      await service.resolve(createContext());

      expect(metricsService.recordPolicyResolution).toHaveBeenCalledWith({
        source: 'safe_mode',
        durationMs: expect.any(Number),
        success: true
      });
    });
  });

  describe('Database Error Handling', () => {
    it('should fallback to default policy on error in resolve flow', async () => {
      const defaultPolicy = createPolicy({
        id: 'pol_default',
        policyType: PolicyType.DEFAULT,
        commissionRate: 10.0
      });

      // First call throws (from main flow), second call succeeds (from catch fallback)
      mockPolicyRepo.findOne
        .mockRejectedValueOnce(new Error('Database timeout'))
        .mockResolvedValueOnce(defaultPolicy);

      const result = await service.resolve(createContext());

      expect(result).not.toBeNull();
      expect(result!.resolutionLevel).toBe('default');
      expect(result!.policy.commissionRate).toBe(10.0);
    });

    it('should return null when all DB lookups fail', async () => {
      // First call (main flow) throws, second call (catch fallback) returns no policy
      mockPolicyRepo.findOne
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce(null);

      const result = await service.resolve(createContext());

      expect(result).toBeNull();
    });

    it('should record error metrics on DB failure', async () => {
      const defaultPolicy = createPolicy({ policyType: PolicyType.DEFAULT });

      mockPolicyRepo.findOne
        .mockRejectedValueOnce(new Error('Database timeout'))
        .mockResolvedValueOnce(defaultPolicy);

      await service.resolve(createContext());

      expect(metricsService.recordPolicyResolution).toHaveBeenCalledWith({
        source: 'default',
        durationMs: expect.any(Number),
        success: false
      });
    });
  });

  describe('Snapshot Creation', () => {
    it('should create immutable snapshot with all policy fields', async () => {
      const defaultPolicy = createPolicy({
        id: 'pol_default',
        policyCode: 'DEFAULT-2025',
        policyType: PolicyType.DEFAULT,
        commissionType: CommissionType.PERCENTAGE,
        commissionRate: 10.0,
        minCommission: 500,
        maxCommission: 50000
      });

      mockPolicyRepo.findOne.mockResolvedValue(defaultPolicy);

      const resolved = await service.resolve(createContext());
      const snapshot = service.createSnapshot(resolved!, 5000);

      expect(snapshot).toEqual({
        policyId: 'pol_default',
        policyCode: 'DEFAULT-2025',
        policyType: PolicyType.DEFAULT,
        commissionType: CommissionType.PERCENTAGE,
        commissionRate: 10.0,
        commissionAmount: undefined,
        minCommission: 500,
        maxCommission: 50000,
        resolutionLevel: 'default',
        appliedAt: expect.any(String),
        calculatedCommission: 5000
      });
    });

    it('should include resolutionLevel as default in snapshot', async () => {
      const defaultPolicy = createPolicy({
        policyType: PolicyType.DEFAULT,
        commissionRate: 10.0
      });

      mockPolicyRepo.findOne.mockResolvedValue(defaultPolicy);

      const resolved = await service.resolve(createContext());
      const snapshot = service.createSnapshot(resolved!, 1000);

      expect(snapshot.resolutionLevel).toBe('default');
    });

    it('should include calculatedCommission in snapshot', async () => {
      const defaultPolicy = createPolicy({
        policyType: PolicyType.DEFAULT,
        commissionRate: 10.0
      });

      mockPolicyRepo.findOne.mockResolvedValue(defaultPolicy);

      const resolved = await service.resolve(createContext());
      const snapshot = service.createSnapshot(resolved!, 7500);

      expect(snapshot.calculatedCommission).toBe(7500);
    });
  });

  describe('Min/Max Commission Caps in Policy', () => {
    it('should preserve maxCommission in resolved default policy', async () => {
      const policy = createPolicy({
        policyType: PolicyType.DEFAULT,
        commissionRate: 10.0,
        maxCommission: 100000
      });

      mockPolicyRepo.findOne.mockResolvedValue(policy);

      const result = await service.resolve(createContext());

      expect(result).not.toBeNull();
      expect(result!.policy.maxCommission).toBe(100000);
    });

    it('should preserve minCommission in resolved default policy', async () => {
      const policy = createPolicy({
        policyType: PolicyType.DEFAULT,
        commissionRate: 10.0,
        minCommission: 5000
      });

      mockPolicyRepo.findOne.mockResolvedValue(policy);

      const result = await service.resolve(createContext());

      expect(result).not.toBeNull();
      expect(result!.policy.minCommission).toBe(5000);
    });
  });
});
