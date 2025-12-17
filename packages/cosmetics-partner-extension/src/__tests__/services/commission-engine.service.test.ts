/**
 * CommissionEngineService Unit Tests
 *
 * Phase 10: STEP 5-B
 * Tests commission calculation and policy resolution
 */

import {
  CommissionEngineService,
  CommissionCalculationInput,
  CommissionCalculationResult,
} from '../../backend/services/commission-engine.service';
import { CommissionPolicy, PolicyType } from '../../backend/entities/commission-policy.entity';

// Mock Repository
const createMockRepository = () => ({
  createQueryBuilder: jest.fn(),
});

const createMockQueryBuilder = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  getOne: jest.fn(),
  getMany: jest.fn(),
});

describe('CommissionEngineService', () => {
  let service: CommissionEngineService;
  let mockRepo: ReturnType<typeof createMockRepository>;
  let mockQueryBuilder: ReturnType<typeof createMockQueryBuilder>;

  // Test data factory
  const createPolicy = (overrides: Partial<CommissionPolicy> = {}): CommissionPolicy => {
    const policy = new CommissionPolicy();
    policy.id = overrides.id || 'policy-123';
    policy.name = overrides.name || 'Test Policy';
    policy.policyType = overrides.policyType || 'PERCENT';
    policy.commissionRate = overrides.commissionRate ?? 0.1; // 10%
    policy.fixedAmount = overrides.fixedAmount ?? 0;
    policy.priority = overrides.priority ?? 0;
    policy.isActive = overrides.isActive ?? true;
    policy.partnerId = overrides.partnerId || null;
    policy.productId = overrides.productId || null;
    policy.campaignId = overrides.campaignId || null;
    policy.effectiveFrom = overrides.effectiveFrom || null;
    policy.effectiveTo = overrides.effectiveTo || null;
    policy.metadata = overrides.metadata || {};
    policy.createdAt = overrides.createdAt || new Date();
    policy.updatedAt = overrides.updatedAt || new Date();
    return policy;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = createMockRepository();
    mockQueryBuilder = createMockQueryBuilder();
    mockRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    service = new CommissionEngineService(mockRepo as any);
  });

  describe('calculate', () => {
    it('should calculate percentage commission correctly', async () => {
      // Arrange
      const policy = createPolicy({
        policyType: 'PERCENT',
        commissionRate: 0.15, // 15%
      });
      mockQueryBuilder.getOne.mockResolvedValue(policy);

      const input: CommissionCalculationInput = {
        partnerId: 'partner-123',
        eventType: 'SALE',
        eventValue: 100000,
      };

      // Act
      const result = await service.calculate(input);

      // Assert
      expect(result.amount).toBe(15000); // 100000 * 0.15
      expect(result.policy).toEqual(policy);
      expect(result.policyId).toBe(policy.id);
      expect(result.calculationDetails.policyType).toBe('PERCENT');
      expect(result.calculationDetails.rate).toBe(0.15);
    });

    it('should calculate fixed commission correctly', async () => {
      // Arrange
      const policy = createPolicy({
        policyType: 'FIXED',
        fixedAmount: 5000,
      });
      mockQueryBuilder.getOne.mockResolvedValue(policy);

      const input: CommissionCalculationInput = {
        partnerId: 'partner-123',
        eventType: 'CONVERSION',
        eventValue: 200000,
      };

      // Act
      const result = await service.calculate(input);

      // Assert
      expect(result.amount).toBe(5000); // Fixed amount regardless of eventValue
      expect(result.calculationDetails.policyType).toBe('FIXED');
      expect(result.calculationDetails.fixedAmount).toBe(5000);
    });

    it('should return zero when no policy found', async () => {
      // Arrange
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const input: CommissionCalculationInput = {
        partnerId: 'partner-no-policy',
        eventType: 'SALE',
        eventValue: 100000,
      };

      // Act
      const result = await service.calculate(input);

      // Assert
      expect(result.amount).toBe(0);
      expect(result.policy).toBeNull();
      expect(result.policyId).toBeNull();
      expect(result.calculationDetails.rate).toBe(0);
    });

    it('should apply max commission cap from metadata', async () => {
      // Arrange
      const policy = createPolicy({
        policyType: 'PERCENT',
        commissionRate: 0.20, // 20%
        metadata: { maxCommission: 10000 },
      });
      mockQueryBuilder.getOne.mockResolvedValue(policy);

      const input: CommissionCalculationInput = {
        partnerId: 'partner-123',
        eventType: 'SALE',
        eventValue: 100000, // 20% = 20000, but capped at 10000
      };

      // Act
      const result = await service.calculate(input);

      // Assert
      expect(result.amount).toBe(10000); // Capped at maxCommission
    });

    it('should round commission to 2 decimal places', async () => {
      // Arrange
      const policy = createPolicy({
        policyType: 'PERCENT',
        commissionRate: 0.123, // 12.3%
      });
      mockQueryBuilder.getOne.mockResolvedValue(policy);

      const input: CommissionCalculationInput = {
        partnerId: 'partner-123',
        eventType: 'SALE',
        eventValue: 1000,
      };

      // Act
      const result = await service.calculate(input);

      // Assert
      expect(result.amount).toBe(123); // 1000 * 0.123 = 123.00
    });
  });

  describe('resolvePolicy', () => {
    it('should resolve policy with partner context', async () => {
      // Arrange
      const policy = createPolicy({ partnerId: 'partner-123' });
      mockQueryBuilder.getOne.mockResolvedValue(policy);

      // Act
      const result = await service.resolvePolicy({
        partnerId: 'partner-123',
        now: new Date(),
      });

      // Assert
      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(result).toEqual(policy);
    });

    it('should include productId in policy lookup when provided', async () => {
      // Arrange
      const policy = createPolicy({ productId: 'product-123' });
      mockQueryBuilder.getOne.mockResolvedValue(policy);

      // Act
      await service.resolvePolicy({
        partnerId: 'partner-123',
        productId: 'product-123',
        now: new Date(),
      });

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should return null when no matching policy', async () => {
      // Arrange
      mockQueryBuilder.getOne.mockResolvedValue(null);

      // Act
      const result = await service.resolvePolicy({
        partnerId: 'partner-no-policy',
        now: new Date(),
      });

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('calculateBatch', () => {
    it('should calculate commission for multiple inputs', async () => {
      // Arrange
      const policy = createPolicy({
        policyType: 'PERCENT',
        commissionRate: 0.10,
      });
      mockQueryBuilder.getOne.mockResolvedValue(policy);

      const inputs: CommissionCalculationInput[] = [
        { partnerId: 'partner-123', eventType: 'SALE', eventValue: 10000 },
        { partnerId: 'partner-123', eventType: 'SALE', eventValue: 20000 },
        { partnerId: 'partner-123', eventType: 'SALE', eventValue: 30000 },
      ];

      // Act
      const results = await service.calculateBatch(inputs);

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0].amount).toBe(1000);
      expect(results[1].amount).toBe(2000);
      expect(results[2].amount).toBe(3000);
    });

    it('should handle mixed policies in batch', async () => {
      // Arrange
      const percentPolicy = createPolicy({ policyType: 'PERCENT', commissionRate: 0.10 });
      const fixedPolicy = createPolicy({ policyType: 'FIXED', fixedAmount: 500 });

      mockQueryBuilder.getOne
        .mockResolvedValueOnce(percentPolicy)
        .mockResolvedValueOnce(fixedPolicy);

      const inputs: CommissionCalculationInput[] = [
        { partnerId: 'partner-1', eventType: 'SALE', eventValue: 10000 },
        { partnerId: 'partner-2', eventType: 'SALE', eventValue: 10000 },
      ];

      // Act
      const results = await service.calculateBatch(inputs);

      // Assert
      expect(results[0].amount).toBe(1000); // 10%
      expect(results[1].amount).toBe(500);  // Fixed
    });
  });

  describe('getApplicablePolicies', () => {
    it('should return all active policies for partner', async () => {
      // Arrange
      const policies = [
        createPolicy({ id: 'p1', priority: 10 }),
        createPolicy({ id: 'p2', priority: 5 }),
      ];
      mockQueryBuilder.getMany.mockResolvedValue(policies);

      // Act
      const result = await service.getApplicablePolicies('partner-123');

      // Assert
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'policy.isActive = :isActive',
        { isActive: true }
      );
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no policies', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([]);

      // Act
      const result = await service.getApplicablePolicies('partner-no-policies');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('simulate', () => {
    it('should return calculation result with breakdown', async () => {
      // Arrange
      const policy = createPolicy({
        policyType: 'PERCENT',
        commissionRate: 0.15,
      });
      mockQueryBuilder.getOne.mockResolvedValue(policy);

      const input: CommissionCalculationInput = {
        partnerId: 'partner-123',
        eventType: 'SALE',
        eventValue: 100000,
      };

      // Act
      const result = await service.simulate(input);

      // Assert
      expect(result.amount).toBe(15000);
      expect(result.breakdown).toContain('100,000');
      expect(result.breakdown).toContain('15.00%');
      expect(result.breakdown).toContain('15,000');
    });

    it('should show fixed amount breakdown', async () => {
      // Arrange
      const policy = createPolicy({
        policyType: 'FIXED',
        fixedAmount: 5000,
      });
      mockQueryBuilder.getOne.mockResolvedValue(policy);

      const input: CommissionCalculationInput = {
        partnerId: 'partner-123',
        eventType: 'SALE',
        eventValue: 100000,
      };

      // Act
      const result = await service.simulate(input);

      // Assert
      expect(result.breakdown).toContain('고정 금액');
      expect(result.breakdown).toContain('5,000');
    });

    it('should show no policy message when none found', async () => {
      // Arrange
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const input: CommissionCalculationInput = {
        partnerId: 'partner-no-policy',
        eventType: 'SALE',
        eventValue: 100000,
      };

      // Act
      const result = await service.simulate(input);

      // Assert
      expect(result.breakdown).toContain('적용 가능한 정책 없음');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero event value', async () => {
      // Arrange
      const policy = createPolicy({
        policyType: 'PERCENT',
        commissionRate: 0.10,
      });
      mockQueryBuilder.getOne.mockResolvedValue(policy);

      const input: CommissionCalculationInput = {
        partnerId: 'partner-123',
        eventType: 'SALE',
        eventValue: 0,
      };

      // Act
      const result = await service.calculate(input);

      // Assert
      expect(result.amount).toBe(0);
    });

    it('should handle very large event value', async () => {
      // Arrange
      const policy = createPolicy({
        policyType: 'PERCENT',
        commissionRate: 0.10,
      });
      mockQueryBuilder.getOne.mockResolvedValue(policy);

      const input: CommissionCalculationInput = {
        partnerId: 'partner-123',
        eventType: 'SALE',
        eventValue: 1000000000, // 1 billion
      };

      // Act
      const result = await service.calculate(input);

      // Assert
      expect(result.amount).toBe(100000000); // 100 million
    });

    it('should handle policy with zero commission rate', async () => {
      // Arrange
      const policy = createPolicy({
        policyType: 'PERCENT',
        commissionRate: 0,
      });
      mockQueryBuilder.getOne.mockResolvedValue(policy);

      const input: CommissionCalculationInput = {
        partnerId: 'partner-123',
        eventType: 'SALE',
        eventValue: 100000,
      };

      // Act
      const result = await service.calculate(input);

      // Assert
      expect(result.amount).toBe(0);
      expect(result.policy).not.toBeNull(); // Policy exists but has 0 rate
    });
  });
});
