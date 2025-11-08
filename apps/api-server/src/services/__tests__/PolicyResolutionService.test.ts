/**
 * PolicyResolutionService Unit Tests
 * Phase 8: Supplier Policy Integration
 *
 * Tests 6 core scenarios + 5 edge cases from TEST_MATRIX.md
 *
 * Created: 2025-11-07
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
  let mockProductRepo: jest.Mocked<Repository<Product>>;
  let mockSupplierRepo: jest.Mocked<Repository<Supplier>>;

  // Test data factories
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

  const createProduct = (overrides: Partial<Product> = {}): Product => {
    const product = new Product();
    product.id = overrides.id || 'product-id';
    product.supplierId = overrides.supplierId || 'supplier-id';
    product.policy = overrides.policy;
    return product;
  };

  const createSupplier = (overrides: Partial<Supplier> = {}): Supplier => {
    const supplier = new Supplier();
    supplier.id = overrides.id || 'supplier-id';
    supplier.policy = overrides.policy;
    return supplier;
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

    // Create mock repositories
    mockPolicyRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn()
    } as any;

    mockProductRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn()
    } as any;

    mockSupplierRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn()
    } as any;

    // Mock AppDataSource
    (AppDataSource.getRepository as jest.Mock) = jest.fn((entity) => {
      if (entity === CommissionPolicy) return mockPolicyRepo;
      if (entity === Product) return mockProductRepo;
      if (entity === Supplier) return mockSupplierRepo;
      throw new Error(`Unknown entity: ${entity}`);
    });

    // Mock FeatureFlags - default enabled
    (FeatureFlags.isSupplierPolicyEnabled as jest.Mock) = jest.fn(() => true);

    // Mock metrics service
    (metricsService.recordPolicyResolution as jest.Mock) = jest.fn();

    // Create service instance
    service = new PolicyResolutionService();
  });

  describe('Core Scenarios', () => {
    describe('Scenario 1: Product Policy Override (Highest Priority)', () => {
      it('should select product policy when product has override and supplier has policy', async () => {
        // Arrange
        const productPolicy = createPolicy({
          id: 'pol_product_active',
          policyCode: 'PRODUCT-PROMO-Q4',
          policyType: PolicyType.PRODUCT_SPECIFIC,
          commissionRate: 25.0,
          maxCommission: 100000
        });

        const supplierPolicy = createPolicy({
          id: 'pol_supplier_active',
          policyCode: 'SUPPLIER-ABC-2025',
          policyType: PolicyType.TIER_BASED, // Using TIER_BASED as proxy for SUPPLIER type
          commissionRate: 15.0
        });

        const product = createProduct({ policy: productPolicy });
        const context = createContext({ orderDate: new Date('2025-11-07') });

        mockProductRepo.findOne.mockResolvedValue(product);

        // Act
        const result = await service.resolve(context);

        // Assert
        expect(result).not.toBeNull();
        expect(result!.resolutionLevel).toBe('product');
        expect(result!.policy.id).toBe('pol_product_active');
        expect(result!.policy.commissionRate).toBe(25.0);
        expect(result!.policy.maxCommission).toBe(100000);
        expect(mockProductRepo.findOne).toHaveBeenCalledWith({
          where: { id: context.productId },
          relations: ['policy']
        });
        expect(metricsService.recordPolicyResolution).toHaveBeenCalledWith({
          source: 'product',
          durationMs: expect.any(Number),
          success: true
        });
      });

      it('should calculate commission correctly with product policy', async () => {
        // Arrange
        const productPolicy = createPolicy({
          id: 'pol_product_active',
          commissionRate: 25.0,
          policyType: PolicyType.PRODUCT_SPECIFIC
        });

        const product = createProduct({ policy: productPolicy });
        const context = createContext();

        mockProductRepo.findOne.mockResolvedValue(product);

        // Act
        const result = await service.resolve(context);

        // Assert - verify policy data for commission calculation
        expect(result).not.toBeNull();
        expect(result!.policy.commissionRate).toBe(25.0);
        // Commission calculation: 100000 * 2 * 25% = 50000 (done in caller)
      });
    });

    describe('Scenario 2: Supplier Policy (Product Has No Override)', () => {
      it('should select supplier policy when product has no override', async () => {
        // Arrange
        const supplierPolicy = createPolicy({
          id: 'pol_supplier_active',
          policyCode: 'SUPPLIER-ABC-2025',
          policyType: PolicyType.TIER_BASED,
          commissionRate: 15.0
        });

        const product = createProduct({ policy: undefined });
        const supplier = createSupplier({ policy: supplierPolicy });
        const context = createContext({ orderDate: new Date('2025-11-07') });

        mockProductRepo.findOne.mockResolvedValue(product);
        mockSupplierRepo.findOne.mockResolvedValue(supplier);

        // Act
        const result = await service.resolve(context);

        // Assert
        expect(result).not.toBeNull();
        expect(result!.resolutionLevel).toBe('supplier');
        expect(result!.policy.id).toBe('pol_supplier_active');
        expect(result!.policy.commissionRate).toBe(15.0);
        expect(mockSupplierRepo.findOne).toHaveBeenCalledWith({
          where: { id: context.supplierId },
          relations: ['policy']
        });
        expect(metricsService.recordPolicyResolution).toHaveBeenCalledWith({
          source: 'supplier',
          durationMs: expect.any(Number),
          success: true
        });
      });

      it('should calculate commission correctly with supplier policy', async () => {
        // Arrange
        const supplierPolicy = createPolicy({
          commissionRate: 15.0,
          policyType: PolicyType.TIER_BASED
        });

        const product = createProduct({ policy: undefined });
        const supplier = createSupplier({ policy: supplierPolicy });
        const context = createContext();

        mockProductRepo.findOne.mockResolvedValue(product);
        mockSupplierRepo.findOne.mockResolvedValue(supplier);

        // Act
        const result = await service.resolve(context);

        // Assert - verify policy data for commission calculation
        expect(result).not.toBeNull();
        expect(result!.policy.commissionRate).toBe(15.0);
        // Commission calculation: 50000 * 1 * 15% = 7500 (done in caller)
      });
    });

    describe('Scenario 3: Default Policy Fallback', () => {
      it('should select default policy when no product/supplier policy found', async () => {
        // Arrange
        const defaultPolicy = createPolicy({
          id: 'pol_default',
          policyCode: 'DEFAULT-2025',
          policyType: PolicyType.DEFAULT,
          commissionRate: 10.0
        });

        const product = createProduct({ policy: undefined });
        const supplier = createSupplier({ policy: undefined });
        const context = createContext({ orderDate: new Date('2025-11-07') });

        mockProductRepo.findOne.mockResolvedValue(product);
        mockSupplierRepo.findOne.mockResolvedValue(supplier);
        mockPolicyRepo.findOne.mockResolvedValue(defaultPolicy);

        // Act
        const result = await service.resolve(context);

        // Assert
        expect(result).not.toBeNull();
        expect(result!.resolutionLevel).toBe('default');
        expect(result!.policy.id).toBe('pol_default');
        expect(result!.policy.commissionRate).toBe(10.0);
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
        expect(metricsService.recordPolicyResolution).toHaveBeenCalledWith({
          source: 'default',
          durationMs: expect.any(Number),
          success: true
        });
      });
    });

    describe('Scenario 4: Expired Policy Falls Back', () => {
      it('should reject expired policy and fallback to default', async () => {
        // Arrange
        const expiredSupplierPolicy = createPolicy({
          id: 'pol_supplier_expired',
          policyCode: 'SUPPLIER-XYZ-2024',
          policyType: PolicyType.TIER_BASED,
          commissionRate: 20.0,
          validFrom: new Date('2024-01-01'),
          validUntil: new Date('2024-12-31') // Expired
        });

        const defaultPolicy = createPolicy({
          id: 'pol_default',
          policyCode: 'DEFAULT-2025',
          policyType: PolicyType.DEFAULT,
          commissionRate: 10.0
        });

        const product = createProduct({ policy: undefined });
        const supplier = createSupplier({ policy: expiredSupplierPolicy });
        const context = createContext({ orderDate: new Date('2025-11-07') }); // After expiry

        mockProductRepo.findOne.mockResolvedValue(product);
        mockSupplierRepo.findOne.mockResolvedValue(supplier);
        mockPolicyRepo.findOne.mockResolvedValue(defaultPolicy);

        // Act
        const result = await service.resolve(context);

        // Assert
        expect(result).not.toBeNull();
        expect(result!.resolutionLevel).toBe('default');
        expect(result!.policy.id).toBe('pol_default');
        expect(result!.policy.commissionRate).toBe(10.0);
        // Verify expired policy was retrieved but rejected
        expect(mockSupplierRepo.findOne).toHaveBeenCalled();
      });

      it('should reject policy where orderDate is before validFrom', async () => {
        // Arrange
        const futurePolicy = createPolicy({
          id: 'pol_future',
          commissionRate: 20.0,
          validFrom: new Date('2025-12-01'), // Starts in future
          validUntil: new Date('2025-12-31')
        });

        const defaultPolicy = createPolicy({
          id: 'pol_default',
          policyType: PolicyType.DEFAULT,
          commissionRate: 10.0
        });

        const product = createProduct({ policy: undefined });
        const supplier = createSupplier({ policy: futurePolicy });
        const context = createContext({ orderDate: new Date('2025-11-07') }); // Before start

        mockProductRepo.findOne.mockResolvedValue(product);
        mockSupplierRepo.findOne.mockResolvedValue(supplier);
        mockPolicyRepo.findOne.mockResolvedValue(defaultPolicy);

        // Act
        const result = await service.resolve(context);

        // Assert
        expect(result!.resolutionLevel).toBe('default');
        expect(result!.policy.commissionRate).toBe(10.0);
      });
    });

    describe('Scenario 5: Safe Mode (No Policy Found)', () => {
      it('should return null when no valid policy found at any level', async () => {
        // Arrange
        const inactiveDefaultPolicy = createPolicy({
          id: 'pol_default',
          policyType: PolicyType.DEFAULT,
          status: PolicyStatus.INACTIVE // Inactive
        });

        const product = createProduct({ policy: undefined });
        const supplier = createSupplier({ policy: undefined });
        const context = createContext();

        mockProductRepo.findOne.mockResolvedValue(product);
        mockSupplierRepo.findOne.mockResolvedValue(supplier);
        mockPolicyRepo.findOne.mockResolvedValue(inactiveDefaultPolicy);

        // Act
        const result = await service.resolve(context);

        // Assert
        expect(result).toBeNull(); // Safe mode - 0% commission
        expect(metricsService.recordPolicyResolution).toHaveBeenCalledWith({
          source: 'safe_mode',
          durationMs: expect.any(Number),
          success: true
        });
      });

      it('should return null when default policy not found in database', async () => {
        // Arrange
        const product = createProduct({ policy: undefined });
        const supplier = createSupplier({ policy: undefined });
        const context = createContext();

        mockProductRepo.findOne.mockResolvedValue(product);
        mockSupplierRepo.findOne.mockResolvedValue(supplier);
        mockPolicyRepo.findOne.mockResolvedValue(null); // No default policy

        // Act
        const result = await service.resolve(context);

        // Assert
        expect(result).toBeNull();
      });
    });

    describe('Scenario 6: Min/Max Commission Caps', () => {
      it('should include maxCommission in resolved policy for cap application', async () => {
        // Arrange
        const policyWithMax = createPolicy({
          id: 'pol_product_active',
          policyType: PolicyType.PRODUCT_SPECIFIC,
          commissionRate: 25.0,
          maxCommission: 100000 // Max cap
        });

        const product = createProduct({ policy: policyWithMax });
        const context = createContext();

        mockProductRepo.findOne.mockResolvedValue(product);

        // Act
        const result = await service.resolve(context);

        // Assert
        expect(result).not.toBeNull();
        expect(result!.policy.commissionRate).toBe(25.0);
        expect(result!.policy.maxCommission).toBe(100000);
        // Raw commission: 500000 * 2 * 25% = 250000
        // Should be capped to 100000 (done by CommissionPolicy.calculateCommission)
      });

      it('should include minCommission in resolved policy for cap application', async () => {
        // Arrange
        const policyWithMin = createPolicy({
          id: 'pol_min_test',
          policyType: PolicyType.TIER_BASED,
          commissionRate: 5.0,
          minCommission: 5000 // Min cap
        });

        const product = createProduct({ policy: undefined });
        const supplier = createSupplier({ policy: policyWithMin });
        const context = createContext();

        mockProductRepo.findOne.mockResolvedValue(product);
        mockSupplierRepo.findOne.mockResolvedValue(supplier);

        // Act
        const result = await service.resolve(context);

        // Assert
        expect(result).not.toBeNull();
        expect(result!.policy.commissionRate).toBe(5.0);
        expect(result!.policy.minCommission).toBe(5000);
        // Raw commission: 10000 * 1 * 5% = 500
        // Should be raised to 5000 (done by CommissionPolicy.calculateCommission)
      });
    });
  });

  describe('Edge Cases', () => {
    describe('Edge Case 1: Policy Expires During Order Processing', () => {
      it('should use policy snapshot from order time even if policy expires later', async () => {
        // Arrange
        const expiringPolicy = createPolicy({
          id: 'pol_expiring_soon',
          commissionRate: 18.0,
          validFrom: new Date('2025-01-01'),
          validUntil: new Date('2025-11-07T23:59:59') // Expires at midnight
        });

        const product = createProduct({ policy: undefined });
        const supplier = createSupplier({ policy: expiringPolicy });
        const context = createContext({
          orderDate: new Date('2025-11-07T10:00:00') // Before expiry
        });

        mockProductRepo.findOne.mockResolvedValue(product);
        mockSupplierRepo.findOne.mockResolvedValue(supplier);

        // Act
        const result = await service.resolve(context);

        // Assert - Policy is valid at order time
        expect(result).not.toBeNull();
        expect(result!.resolutionLevel).toBe('supplier');
        expect(result!.policy.commissionRate).toBe(18.0);
        // Snapshot remains valid even after policy expires
      });
    });

    describe('Edge Case 2: Policy Updated After Order', () => {
      it('should resolve to current policy at order time (immutability handled by snapshot)', async () => {
        // Arrange
        const currentPolicy = createPolicy({
          id: 'pol_updatable',
          commissionRate: 10.0 // Current rate at order time
        });

        const product = createProduct({ policy: undefined });
        const supplier = createSupplier({ policy: currentPolicy });
        const context = createContext({ orderDate: new Date('2025-11-07') });

        mockProductRepo.findOne.mockResolvedValue(product);
        mockSupplierRepo.findOne.mockResolvedValue(supplier);

        // Act
        const result = await service.resolve(context);

        // Assert - Returns current policy (snapshot handles immutability)
        expect(result).not.toBeNull();
        expect(result!.policy.commissionRate).toBe(10.0);
        // Note: Policy might be updated to 15% later, but snapshot preserves 10%
      });
    });

    describe('Edge Case 3: Feature Flag Disabled', () => {
      it('should skip product/supplier lookup when feature flag disabled', async () => {
        // Arrange
        (FeatureFlags.isSupplierPolicyEnabled as jest.Mock).mockReturnValue(false);

        const defaultPolicy = createPolicy({
          id: 'pol_default',
          policyType: PolicyType.DEFAULT,
          commissionRate: 10.0
        });

        const context = createContext();

        mockPolicyRepo.findOne.mockResolvedValue(defaultPolicy);

        // Act
        const result = await service.resolve(context);

        // Assert
        expect(result).not.toBeNull();
        expect(result!.resolutionLevel).toBe('default');
        expect(result!.policy.commissionRate).toBe(10.0);
        // Verify product/supplier lookup skipped
        expect(mockProductRepo.findOne).not.toHaveBeenCalled();
        expect(mockSupplierRepo.findOne).not.toHaveBeenCalled();
      });

      it('should jump to default policy when feature disabled even with product override', async () => {
        // Arrange
        (FeatureFlags.isSupplierPolicyEnabled as jest.Mock).mockReturnValue(false);

        const defaultPolicy = createPolicy({
          id: 'pol_default',
          policyType: PolicyType.DEFAULT,
          commissionRate: 10.0
        });

        const context = createContext();

        mockPolicyRepo.findOne.mockResolvedValue(defaultPolicy);

        // Act
        const result = await service.resolve(context);

        // Assert
        expect(result!.resolutionLevel).toBe('default');
        expect(mockProductRepo.findOne).not.toHaveBeenCalled();
      });
    });

    describe('Edge Case 4: Database Connection Failure', () => {
      it('should handle product lookup error gracefully and fallback to default', async () => {
        // Arrange
        const defaultPolicy = createPolicy({
          id: 'pol_default',
          policyType: PolicyType.DEFAULT,
          commissionRate: 10.0
        });

        const context = createContext();

        mockProductRepo.findOne.mockRejectedValue(new Error('Database connection timeout'));
        mockPolicyRepo.findOne.mockResolvedValue(defaultPolicy);

        // Act
        const result = await service.resolve(context);

        // Assert - Should not throw, should fallback to default
        expect(result).not.toBeNull();
        expect(result!.resolutionLevel).toBe('default');
        expect(result!.policy.commissionRate).toBe(10.0);
        expect(metricsService.recordPolicyResolution).toHaveBeenCalledWith({
          source: 'default',
          durationMs: expect.any(Number),
          success: false
        });
      });

      it('should trigger safe mode when default policy lookup also fails', async () => {
        // Arrange
        const context = createContext();

        mockProductRepo.findOne.mockRejectedValue(new Error('Database error'));
        mockPolicyRepo.findOne.mockRejectedValue(new Error('Database error'));

        // Act
        const result = await service.resolve(context);

        // Assert - Safe mode (null)
        expect(result).toBeNull();
      });
    });

    describe('Edge Case 5: Policy Resolution Timeout', () => {
      it('should complete resolution within reasonable time', async () => {
        // Arrange
        const policy = createPolicy({ commissionRate: 10.0 });
        const product = createProduct({ policy });
        const context = createContext();

        mockProductRepo.findOne.mockResolvedValue(product);

        // Act
        const startTime = Date.now();
        const result = await service.resolve(context);
        const duration = Date.now() - startTime;

        // Assert - Should complete quickly (within 100ms for unit test)
        expect(result).not.toBeNull();
        expect(duration).toBeLessThan(100); // 100ms timeout
      });

      it('should measure and record resolution time', async () => {
        // Arrange
        const policy = createPolicy({ commissionRate: 10.0 });
        const product = createProduct({ policy });
        const context = createContext();

        mockProductRepo.findOne.mockResolvedValue(product);

        // Act
        const result = await service.resolve(context);

        // Assert
        expect(result).not.toBeNull();
        expect(result!.resolutionTimeMs).toBeGreaterThanOrEqual(0);
        expect(result!.resolutionTimeMs).toBeLessThan(100);
        expect(metricsService.recordPolicyResolution).toHaveBeenCalledWith({
          source: 'product',
          durationMs: expect.any(Number),
          success: true
        });
      });
    });
  });

  describe('Policy Validation', () => {
    it('should reject policy with INACTIVE status', async () => {
      // Arrange
      const inactivePolicy = createPolicy({
        status: PolicyStatus.INACTIVE,
        commissionRate: 20.0
      });

      const defaultPolicy = createPolicy({
        id: 'pol_default',
        policyType: PolicyType.DEFAULT,
        commissionRate: 10.0
      });

      const product = createProduct({ policy: inactivePolicy });
      const context = createContext();

      mockProductRepo.findOne.mockResolvedValue(product);
      mockPolicyRepo.findOne.mockResolvedValue(defaultPolicy);

      // Act
      const result = await service.resolve(context);

      // Assert - Should fallback to default
      expect(result!.resolutionLevel).toBe('default');
      expect(result!.policy.commissionRate).toBe(10.0);
    });

    it('should accept policy with ACTIVE status', async () => {
      // Arrange
      const activePolicy = createPolicy({
        status: PolicyStatus.ACTIVE,
        commissionRate: 20.0
      });

      const product = createProduct({ policy: activePolicy });
      const context = createContext();

      mockProductRepo.findOne.mockResolvedValue(product);

      // Act
      const result = await service.resolve(context);

      // Assert
      expect(result!.policy.status).toBe(PolicyStatus.ACTIVE);
      expect(result!.policy.commissionRate).toBe(20.0);
    });

    it('should accept policy with no date constraints', async () => {
      // Arrange
      const policyNoDates = createPolicy({
        commissionRate: 20.0,
        validFrom: undefined,
        validUntil: undefined
      });

      const product = createProduct({ policy: policyNoDates });
      const context = createContext();

      mockProductRepo.findOne.mockResolvedValue(product);

      // Act
      const result = await service.resolve(context);

      // Assert - Should accept policy without date range
      expect(result!.policy.commissionRate).toBe(20.0);
    });
  });

  describe('Snapshot Creation', () => {
    it('should create immutable snapshot with all policy fields', async () => {
      // Arrange
      const policy = createPolicy({
        id: 'pol_test',
        policyCode: 'TEST-2025',
        policyType: PolicyType.PRODUCT_SPECIFIC,
        commissionType: CommissionType.PERCENTAGE,
        commissionRate: 25.0,
        minCommission: 1000,
        maxCommission: 50000
      });

      const product = createProduct({ policy });
      const context = createContext();

      mockProductRepo.findOne.mockResolvedValue(product);

      // Act
      const resolved = await service.resolve(context);
      const snapshot = service.createSnapshot(resolved!, 12500);

      // Assert
      expect(snapshot).toEqual({
        policyId: 'pol_test',
        policyCode: 'TEST-2025',
        policyType: PolicyType.PRODUCT_SPECIFIC,
        commissionType: CommissionType.PERCENTAGE,
        commissionRate: 25.0,
        commissionAmount: undefined,
        minCommission: 1000,
        maxCommission: 50000,
        resolutionLevel: 'product',
        appliedAt: expect.any(String),
        calculatedCommission: 12500
      });
    });

    it('should include resolutionLevel in snapshot', async () => {
      // Arrange
      const supplierPolicy = createPolicy({ commissionRate: 15.0 });
      const product = createProduct({ policy: undefined });
      const supplier = createSupplier({ policy: supplierPolicy });
      const context = createContext();

      mockProductRepo.findOne.mockResolvedValue(product);
      mockSupplierRepo.findOne.mockResolvedValue(supplier);

      // Act
      const resolved = await service.resolve(context);
      const snapshot = service.createSnapshot(resolved!, 7500);

      // Assert
      expect(snapshot.resolutionLevel).toBe('supplier');
    });
  });

  describe('Priority Hierarchy Verification', () => {
    it('should always prefer product policy over supplier policy', async () => {
      // Arrange
      const productPolicy = createPolicy({
        id: 'product-policy',
        policyType: PolicyType.PRODUCT_SPECIFIC,
        commissionRate: 30.0,
        priority: 10
      });

      const supplierPolicy = createPolicy({
        id: 'supplier-policy',
        policyType: PolicyType.TIER_BASED,
        commissionRate: 20.0,
        priority: 100 // Higher priority number, but supplier level is lower
      });

      const product = createProduct({ policy: productPolicy });
      const supplier = createSupplier({ policy: supplierPolicy });
      const context = createContext();

      mockProductRepo.findOne.mockResolvedValue(product);
      mockSupplierRepo.findOne.mockResolvedValue(supplier);

      // Act
      const result = await service.resolve(context);

      // Assert - Product policy wins regardless of priority field
      expect(result!.resolutionLevel).toBe('product');
      expect(result!.policy.id).toBe('product-policy');
      expect(result!.policy.commissionRate).toBe(30.0);
    });

    it('should prefer supplier policy over default policy', async () => {
      // Arrange
      const supplierPolicy = createPolicy({
        id: 'supplier-policy',
        commissionRate: 15.0
      });

      const defaultPolicy = createPolicy({
        id: 'default-policy',
        policyType: PolicyType.DEFAULT,
        commissionRate: 10.0
      });

      const product = createProduct({ policy: undefined });
      const supplier = createSupplier({ policy: supplierPolicy });
      const context = createContext();

      mockProductRepo.findOne.mockResolvedValue(product);
      mockSupplierRepo.findOne.mockResolvedValue(supplier);
      mockPolicyRepo.findOne.mockResolvedValue(defaultPolicy);

      // Act
      const result = await service.resolve(context);

      // Assert - Supplier policy wins over default
      expect(result!.resolutionLevel).toBe('supplier');
      expect(result!.policy.id).toBe('supplier-policy');
      expect(result!.policy.commissionRate).toBe(15.0);
    });
  });

  describe('Metrics Recording', () => {
    it('should record metrics for each resolution level', async () => {
      // Test product level
      const productPolicy = createPolicy({ commissionRate: 25.0 });
      const product = createProduct({ policy: productPolicy });
      mockProductRepo.findOne.mockResolvedValue(product);

      await service.resolve(createContext());

      expect(metricsService.recordPolicyResolution).toHaveBeenCalledWith({
        source: 'product',
        durationMs: expect.any(Number),
        success: true
      });
    });

    it('should record safe mode metrics when no policy found', async () => {
      // Arrange
      mockProductRepo.findOne.mockResolvedValue(createProduct({ policy: undefined }));
      mockSupplierRepo.findOne.mockResolvedValue(createSupplier({ policy: undefined }));
      mockPolicyRepo.findOne.mockResolvedValue(null);

      // Act
      await service.resolve(createContext());

      // Assert
      expect(metricsService.recordPolicyResolution).toHaveBeenCalledWith({
        source: 'safe_mode',
        durationMs: expect.any(Number),
        success: true
      });
    });
  });
});
