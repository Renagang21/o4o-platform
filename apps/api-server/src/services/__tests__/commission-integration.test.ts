/**
 * Commission Integration Tests
 * Phase 8: End-to-End Order Commission Flow
 *
 * Tests the complete flow from order placement to commission calculation
 * with policy resolution and snapshot saving.
 *
 * Created: 2025-01-07
 */

import { Repository } from 'typeorm';
import { SettlementService, CommissionCalculationRequest } from '../SettlementService.js';
import { CommissionPolicy, PolicyType, PolicyStatus, CommissionType } from '../../entities/CommissionPolicy.js';
import { Product } from '../../entities/Product.js';
import { Supplier } from '../../entities/Supplier.js';
import { AppDataSource } from '../../database/connection.js';
import FeatureFlags from '../../config/featureFlags.js';
import metricsService from '../metrics.service.js';

// Mock dependencies BEFORE imports
jest.mock('../../database/connection.js', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    isInitialized: true
  }
}));
jest.mock('../../config/featureFlags.js');
jest.mock('../metrics.service.js');
jest.mock('../../utils/logger.js', () => {
  return {
    __esModule: true,
    default: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }
  };
});

describe('Commission Integration Tests', () => {
  let settlementService: SettlementService;
  let mockPolicyRepo: jest.Mocked<Repository<CommissionPolicy>>;
  let mockProductRepo: jest.Mocked<Repository<Product>>;
  let mockSupplierRepo: jest.Mocked<Repository<Supplier>>;
  let mockCommissionRepo: jest.Mocked<Repository<any>>;
  let mockOrderRepo: jest.Mocked<Repository<any>>;

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
    product.policyId = overrides.policy?.id;
    return product;
  };

  const createSupplier = (overrides: Partial<Supplier> = {}): Supplier => {
    const supplier = new Supplier();
    supplier.id = overrides.id || 'supplier-id';
    supplier.policy = overrides.policy;
    supplier.policyId = overrides.policy?.id;
    return supplier;
  };

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

    mockCommissionRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn()
    } as any;

    mockOrderRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn()
    } as any;

    // Mock AppDataSource
    (AppDataSource.getRepository as jest.Mock) = jest.fn((entity: any) => {
      const entityName = entity.name || entity;
      if (entityName === 'CommissionPolicy' || entity === CommissionPolicy) return mockPolicyRepo;
      if (entityName === 'Product' || entity === Product) return mockProductRepo;
      if (entityName === 'Supplier' || entity === Supplier) return mockSupplierRepo;
      if (entityName === 'Commission') return mockCommissionRepo;
      if (entityName === 'Order') return mockOrderRepo;
      // Return a default mock for any other entity
      return {
        findOne: jest.fn(),
        find: jest.fn(),
        save: jest.fn(),
        create: jest.fn()
      };
    });

    // Mock FeatureFlags - default enabled (normal mode)
    (FeatureFlags.isSupplierPolicyEnabled as jest.Mock).mockReturnValue(true);

    // Mock metrics service
    (metricsService.recordCommissionCalculation as jest.Mock) = jest.fn();
    (metricsService.recordPolicyResolution as jest.Mock) = jest.fn();

    // Initialize service
    settlementService = new SettlementService();
  });

  describe('Test 1: End-to-End Order Flow with Policy Resolution', () => {
    it('should calculate commission with supplier policy and save snapshot', async () => {
      // Arrange: Create test data
      const supplierPolicy = createPolicy({
        id: 'pol_supplier_active',
        policyCode: 'SUPPLIER-ABC-2025',
        policyType: PolicyType.TIER_BASED,
        commissionRate: 15.0
      });

      const supplier = createSupplier({
        id: 'supplier-1',
        policy: supplierPolicy
      });

      const product = createProduct({
        id: 'product-1',
        supplierId: supplier.id,
        policy: undefined // No product override
      });

      // Mock repository responses
      mockProductRepo.findOne.mockResolvedValue(product);
      mockSupplierRepo.findOne.mockResolvedValue(supplier);

      // Act: Calculate commission
      const request: CommissionCalculationRequest = {
        orderId: 'order-1',
        orderItemId: 'item-1',
        productId: product.id,
        supplierId: supplier.id,
        partnerId: 'partner-1',
        price: 50000,
        quantity: 2,
        orderDate: new Date('2025-11-07')
      };

      const result = await settlementService.calculateCommission(request);

      // Assert: Verify policy resolved correctly
      expect(result).toBeDefined();
      expect(result.resolutionLevel).toBe('supplier');
      expect(result.commissionRate).toBe(15.0);

      // Assert: Verify commission calculated correctly
      const expectedCommission = 50000 * 2 * 0.15; // 15,000
      expect(result.commissionAmount).toBe(expectedCommission);

      // Assert: Verify snapshot contains all required fields
      expect(result.appliedPolicy).toBeDefined();
      expect(result.appliedPolicy.policyId).toBe(supplierPolicy.id);
      expect(result.appliedPolicy.policyCode).toBe(supplierPolicy.policyCode);
      expect(result.appliedPolicy.resolutionLevel).toBe('supplier');
      expect(result.appliedPolicy.commissionType).toBe(CommissionType.PERCENTAGE);
      expect(result.appliedPolicy.commissionRate).toBe(15.0);
      expect(result.appliedPolicy.calculatedCommission).toBe(expectedCommission);
      expect(result.appliedPolicy.appliedAt).toBeDefined();

      // Assert: Verify metrics recorded
      expect(metricsService.recordCommissionCalculation).toHaveBeenCalledWith({
        result: 'success',
        value: expectedCommission,
        source: 'supplier'
      });
    });

    it('should handle min/max commission constraints', async () => {
      // Arrange: Create policy with max commission cap
      const cappedPolicy = createPolicy({
        id: 'pol_capped',
        policyCode: 'CAPPED-POLICY',
        policyType: PolicyType.TIER_BASED,
        commissionRate: 25.0,
        maxCommission: 10000 // Cap at 10,000
      });

      const supplier = createSupplier({
        id: 'supplier-capped',
        policy: cappedPolicy
      });

      const product = createProduct({
        id: 'product-capped',
        supplierId: supplier.id
      });

      // Mock repository responses
      mockProductRepo.findOne.mockResolvedValue(product);
      mockSupplierRepo.findOne.mockResolvedValue(supplier);

      // Act: Calculate commission
      const request: CommissionCalculationRequest = {
        orderId: 'order-capped',
        orderItemId: 'item-capped',
        productId: product.id,
        supplierId: supplier.id,
        partnerId: 'partner-1',
        price: 100000,
        quantity: 1,
        orderDate: new Date()
      };

      const result = await settlementService.calculateCommission(request);

      // Assert: Verify commission capped at max
      // Raw: 100000 * 25% = 25000
      // Capped: 10000
      expect(result.commissionAmount).toBe(10000);
      expect(result.appliedPolicy.maxCommission).toBe(10000);
    });
  });

  describe('Test 2: Product Override Priority', () => {
    it('should use product policy when product has override instead of supplier policy', async () => {
      // Arrange: Create supplier with policy
      const supplierPolicy = createPolicy({
        id: 'pol_supplier',
        policyCode: 'SUPPLIER-POLICY',
        policyType: PolicyType.TIER_BASED,
        commissionRate: 15.0
      });

      const supplier = createSupplier({
        id: 'supplier-2',
        policy: supplierPolicy
      });

      // Arrange: Create product with override policy
      const productPolicy = createPolicy({
        id: 'pol_product',
        policyCode: 'PRODUCT-PROMO',
        policyType: PolicyType.PRODUCT_SPECIFIC,
        commissionRate: 25.0
      });

      const product = createProduct({
        id: 'product-2',
        supplierId: supplier.id,
        policy: productPolicy // Product override
      });

      // Mock repository responses
      mockProductRepo.findOne.mockResolvedValue(product);

      // Act: Calculate commission
      const request: CommissionCalculationRequest = {
        orderId: 'order-2',
        orderItemId: 'item-2',
        productId: product.id,
        supplierId: supplier.id,
        partnerId: 'partner-1',
        price: 50000,
        quantity: 1,
        orderDate: new Date()
      };

      const result = await settlementService.calculateCommission(request);

      // Assert: Verify product policy used (not supplier)
      expect(result.resolutionLevel).toBe('product');
      expect(result.commissionRate).toBe(25.0); // Product policy rate
      expect(result.commissionAmount).toBe(50000 * 0.25); // 12,500

      // Assert: Verify snapshot references product policy
      expect(result.appliedPolicy.policyId).toBe(productPolicy.id);
      expect(result.appliedPolicy.policyCode).toBe(productPolicy.policyCode);
      expect(result.appliedPolicy.resolutionLevel).toBe('product');
    });
  });

  describe('Test 3: Shadow Mode Comparison', () => {
    it('should use legacy calculation when feature flag is OFF', async () => {
      // Arrange: Disable feature flag
      (FeatureFlags.isSupplierPolicyEnabled as jest.Mock).mockReturnValue(false);

      // Act: Calculate commission
      const request: CommissionCalculationRequest = {
        orderId: 'order-shadow',
        orderItemId: 'item-shadow',
        productId: 'product-shadow',
        supplierId: 'supplier-shadow',
        partnerId: 'partner-shadow',
        price: 50000,
        quantity: 2,
        orderDate: new Date()
      };

      const result = await settlementService.calculateCommission(request);

      // Assert: Verify legacy commission used (10% flat rate)
      expect(result.resolutionLevel).toBe('legacy');
      expect(result.commissionRate).toBe(10);
      const expectedLegacyCommission = 50000 * 2 * 0.10; // 10,000
      expect(result.commissionAmount).toBe(expectedLegacyCommission);

      // Assert: Verify no policy snapshot in legacy mode
      expect(result.appliedPolicy).toBeNull();

      // Assert: Verify metrics recorded as legacy
      expect(metricsService.recordCommissionCalculation).toHaveBeenCalledWith({
        result: 'success',
        value: expectedLegacyCommission,
        source: 'legacy'
      });
    });

    it('should handle zero commission in legacy mode', async () => {
      // Arrange: Disable feature flag
      (FeatureFlags.isSupplierPolicyEnabled as jest.Mock).mockReturnValue(false);

      // Act: Calculate commission with zero price
      const request: CommissionCalculationRequest = {
        orderId: 'order-zero',
        orderItemId: 'item-zero',
        productId: 'product-zero',
        supplierId: 'supplier-zero',
        partnerId: 'partner-zero',
        price: 0,
        quantity: 1,
        orderDate: new Date()
      };

      const result = await settlementService.calculateCommission(request);

      // Assert: Verify zero commission
      expect(result.commissionAmount).toBe(0);
      expect(result.resolutionLevel).toBe('legacy');
    });
  });

  describe('Test 4: Safe Mode Fallback', () => {
    it('should return zero commission when no policy found', async () => {
      // Arrange: Create product and supplier without policies
      const supplier = createSupplier({
        id: 'supplier-noPolicy',
        policy: undefined // No policy
      });

      const product = createProduct({
        id: 'product-noPolicy',
        supplierId: supplier.id,
        policy: undefined // No policy
      });

      // Mock repository responses
      mockProductRepo.findOne.mockResolvedValue(product);
      mockSupplierRepo.findOne.mockResolvedValue(supplier);
      mockPolicyRepo.findOne.mockResolvedValue(null); // No default policy

      // Act: Calculate commission
      const request: CommissionCalculationRequest = {
        orderId: 'order-safe',
        orderItemId: 'item-safe',
        productId: product.id,
        supplierId: supplier.id,
        partnerId: 'partner-1',
        price: 50000,
        quantity: 1,
        orderDate: new Date()
      };

      const result = await settlementService.calculateCommission(request);

      // Assert: Verify safe mode (0% commission)
      expect(result.resolutionLevel).toBe('safe_mode');
      expect(result.commissionAmount).toBe(0);
      expect(result.commissionRate).toBe(0);
      expect(result.appliedPolicy).toBeNull();

      // Assert: Verify fallback metrics recorded
      expect(metricsService.recordCommissionCalculation).toHaveBeenCalledWith({
        result: 'fallback',
        value: 0,
        source: 'safe_mode'
      });
    });

    it('should use default policy when no product/supplier policy', async () => {
      // Arrange: Create default policy
      const defaultPolicy = createPolicy({
        id: 'pol_default',
        policyCode: 'DEFAULT-2025',
        policyType: PolicyType.DEFAULT,
        commissionRate: 10.0
      });

      const supplier = createSupplier({
        id: 'supplier-default',
        policy: undefined
      });

      const product = createProduct({
        id: 'product-default',
        supplierId: supplier.id,
        policy: undefined
      });

      // Mock repository responses
      mockProductRepo.findOne.mockResolvedValue(product);
      mockSupplierRepo.findOne.mockResolvedValue(supplier);
      mockPolicyRepo.findOne.mockResolvedValue(defaultPolicy);

      // Act: Calculate commission
      const request: CommissionCalculationRequest = {
        orderId: 'order-default',
        orderItemId: 'item-default',
        productId: product.id,
        supplierId: supplier.id,
        partnerId: 'partner-1',
        price: 50000,
        quantity: 1,
        orderDate: new Date()
      };

      const result = await settlementService.calculateCommission(request);

      // Assert: Verify default policy used
      expect(result.resolutionLevel).toBe('default');
      expect(result.commissionRate).toBe(10.0);
      expect(result.commissionAmount).toBe(50000 * 0.10); // 5,000
    });
  });

  describe('Test 5: Error Handling', () => {
    it('should handle database errors gracefully and return safe mode', async () => {
      // Arrange: Mock database error
      mockProductRepo.findOne.mockRejectedValue(new Error('Database connection failed'));

      // Act: Calculate commission
      const request: CommissionCalculationRequest = {
        orderId: 'order-error',
        orderItemId: 'item-error',
        productId: 'invalid-product',
        supplierId: 'invalid-supplier',
        partnerId: 'partner-1',
        price: 50000,
        quantity: 1,
        orderDate: new Date()
      };

      // Act & Assert: Should not throw, should return safe mode
      const result = await settlementService.calculateCommission(request);

      expect(result).toBeDefined();
      expect(result.resolutionLevel).toBe('safe_mode');
      expect(result.commissionAmount).toBe(0);
      expect(result.appliedPolicy).toBeNull();

      // Assert: Verify safe mode metrics recorded (errors are caught by PolicyResolutionService)
      expect(metricsService.recordCommissionCalculation).toHaveBeenCalledWith({
        result: 'fallback',
        value: 0,
        source: 'safe_mode'
      });
    });
  });

  describe('Test 6: Performance', () => {
    it('should complete calculation within reasonable time', async () => {
      // Arrange: Create simple test data
      const defaultPolicy = createPolicy({
        id: 'pol_perf',
        policyCode: 'DEFAULT-PERF',
        policyType: PolicyType.DEFAULT,
        commissionRate: 10.0
      });

      const product = createProduct({ id: 'product-perf' });
      const supplier = createSupplier({ id: 'supplier-perf', policy: undefined });

      mockProductRepo.findOne.mockResolvedValue(product);
      mockSupplierRepo.findOne.mockResolvedValue(supplier);
      mockPolicyRepo.findOne.mockResolvedValue(defaultPolicy);

      const request: CommissionCalculationRequest = {
        orderId: 'order-perf',
        orderItemId: 'item-perf',
        productId: product.id,
        supplierId: supplier.id,
        partnerId: 'partner-1',
        price: 50000,
        quantity: 1,
        orderDate: new Date()
      };

      // Act: Measure calculation time
      const startTime = Date.now();
      const result = await settlementService.calculateCommission(request);
      const duration = Date.now() - startTime;

      // Assert: Should complete quickly (within 1 second)
      expect(duration).toBeLessThan(1000);
      expect(result.calculationTimeMs).toBeDefined();
      expect(result.calculationTimeMs).toBeGreaterThanOrEqual(0);
    });
  });
});
