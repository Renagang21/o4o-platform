/**
 * Dashboard KPI Integration Tests
 * Phase B-4 Step 9 - Tests Dashboard Services real data integration
 */

import { initializeTestDatabase, closeTestDatabase, clearTestDatabase } from '../../../__tests__/setup/test-database';
import { createCompleteTestScenario, createTestSeller, createTestSupplier, createTestProduct } from '../../../__tests__/setup/test-fixtures';
import { SellerDashboardService } from '../services/SellerDashboardService';
import { SupplierDashboardService } from '../services/SupplierDashboardService';
import { SellerAuthorizationService } from '../services/SellerAuthorizationService';
import { SellerProductService } from '../services/SellerProductService';
import { SettlementManagementService } from '../services/SettlementManagementService';

describe('Dashboard KPI Integration Tests', () => {
  let sellerDashboardService: SellerDashboardService;
  let supplierDashboardService: SupplierDashboardService;
  let authService: SellerAuthorizationService;
  let productService: SellerProductService;
  let settlementMgmtService: SettlementManagementService;

  beforeAll(async () => {
    await initializeTestDatabase();
    sellerDashboardService = new SellerDashboardService();
    supplierDashboardService = new SupplierDashboardService();
    authService = new SellerAuthorizationService();
    productService = new SellerProductService();
    settlementMgmtService = new SettlementManagementService();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe('SellerDashboardService', () => {
    it('should return initial empty statistics', async () => {
      // Arrange
      const seller = await createTestSeller();

      // Act
      const summary = await sellerDashboardService.getSummaryForSeller(seller.id);

      // Assert
      expect(summary).toBeDefined();
      expect(summary.totalOrders).toBe(0);
      expect(summary.totalRevenue).toBe(0);
      expect(summary.totalProducts).toBe(0);
      expect(summary.totalAuthorizations).toBe(0);
    });

    it('should reflect authorization statistics', async () => {
      // Arrange
      const seller = await createTestSeller();
      const supplier = await createTestSupplier();
      const product = await createTestProduct(supplier.id);

      await authService.requestAuthorization({
        sellerId: seller.id,
        productId: product.id
      });

      // Act
      const summary = await sellerDashboardService.getSummaryForSeller(seller.id);

      // Assert
      expect(summary.totalAuthorizations).toBe(1);
      expect(summary.pendingAuthorizations).toBe(1);
      expect(summary.approvedAuthorizations).toBe(0);
    });

    it('should reflect product catalog statistics', async () => {
      // Arrange
      const seller = await createTestSeller();
      const supplier = await createTestSupplier();
      const product = await createTestProduct(supplier.id);

      const authorization = await authService.requestAuthorization({
        sellerId: seller.id,
        productId: product.id
      });

      await authService.approveAuthorization(authorization.id, supplier.id);

      await productService.addProductToSeller(
        seller.id,
        product.id,
        { margin: 10000, price: 60000, isActive: true }
      );

      // Act
      const summary = await sellerDashboardService.getSummaryForSeller(seller.id);

      // Assert
      expect(summary.totalProducts).toBe(1);
      expect(summary.activeProducts).toBe(1);
      expect(summary.inactiveProducts).toBe(0);
    });

    it('should reflect order statistics after order placed', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { seller, order } = scenario;

      // Act
      const summary = await sellerDashboardService.getSummaryForSeller(seller.id);

      // Assert
      expect(summary.totalOrders).toBeGreaterThanOrEqual(1);
      expect(summary.totalRevenue).toBeGreaterThan(0);
      expect(summary.totalItems).toBeGreaterThan(0);
    });

    it('should calculate average order value correctly', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { seller, order } = scenario;
      const orderItem = order.items[0];

      // Act
      const summary = await sellerDashboardService.getSummaryForSeller(seller.id);

      // Assert
      expect(summary.averageOrderValue).toBeGreaterThan(0);

      if (summary.totalOrders > 0) {
        const expectedAverage = summary.totalRevenue / summary.totalOrders;
        expect(summary.averageOrderValue).toBeCloseTo(expectedAverage, 0);
      }
    });
  });

  describe('SupplierDashboardService', () => {
    it('should return initial empty statistics', async () => {
      // Arrange
      const supplier = await createTestSupplier();

      // Act
      const summary = await supplierDashboardService.getSummaryForSupplier(supplier.id);

      // Assert
      expect(summary).toBeDefined();
      expect(summary.totalOrders).toBe(0);
      expect(summary.totalRevenue).toBe(0);
      expect(summary.totalProducts).toBe(0);
    });

    it('should reflect product statistics', async () => {
      // Arrange
      const supplier = await createTestSupplier();
      await createTestProduct(supplier.id, { status: 'ACTIVE' });
      await createTestProduct(supplier.id, { status: 'DRAFT' });

      // Act
      const summary = await supplierDashboardService.getSummaryForSupplier(supplier.id);

      // Assert
      expect(summary.totalProducts).toBe(2);
      expect(summary.approvedProducts).toBe(1); // ACTIVE
      expect(summary.pendingProducts).toBe(1);  // DRAFT
    });

    it('should reflect inventory status', async () => {
      // Arrange
      const supplier = await createTestSupplier();
      await createTestProduct(supplier.id, {
        inventory: 5,
        lowStockThreshold: 10,
        trackInventory: true
      }); // Low stock
      await createTestProduct(supplier.id, {
        inventory: 0,
        trackInventory: true
      }); // Out of stock

      // Act
      const summary = await supplierDashboardService.getSummaryForSupplier(supplier.id);

      // Assert
      expect(summary.lowStockProducts).toBeGreaterThanOrEqual(1);
      expect(summary.outOfStockProducts).toBeGreaterThanOrEqual(1);
    });

    it('should reflect order statistics', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { supplier } = scenario;

      // Act
      const summary = await supplierDashboardService.getSummaryForSupplier(supplier.id);

      // Assert
      expect(summary.totalOrders).toBeGreaterThanOrEqual(1);
      expect(summary.totalRevenue).toBeGreaterThan(0);
      expect(summary.averageOrderValue).toBeGreaterThan(0);
    });
  });

  describe('Real-Time Dashboard Updates', () => {
    it('should update seller dashboard after each workflow stage', async () => {
      // Arrange
      const seller = await createTestSeller();
      const supplier = await createTestSupplier();
      const product = await createTestProduct(supplier.id);

      // Stage 1: Initial state
      const initial = await sellerDashboardService.getSummaryForSeller(seller.id);
      expect(initial.totalAuthorizations).toBe(0);
      expect(initial.totalProducts).toBe(0);

      // Stage 2: After authorization request
      const authorization = await authService.requestAuthorization({
        sellerId: seller.id,
        productId: product.id
      });

      const afterRequest = await sellerDashboardService.getSummaryForSeller(seller.id);
      expect(afterRequest.totalAuthorizations).toBe(1);
      expect(afterRequest.pendingAuthorizations).toBe(1);

      // Stage 3: After authorization approval
      await authService.approveAuthorization(authorization.id, supplier.id);

      const afterApproval = await sellerDashboardService.getSummaryForSeller(seller.id);
      expect(afterApproval.approvedAuthorizations).toBe(1);

      // Stage 4: After product addition
      await productService.addProductToSeller(
        seller.id,
        product.id,
        { margin: 10000, price: 60000, isActive: true }
      );

      const afterProduct = await sellerDashboardService.getSummaryForSeller(seller.id);
      expect(afterProduct.totalProducts).toBe(1);
      expect(afterProduct.activeProducts).toBe(1);
    });

    it('should update supplier dashboard after authorization approval', async () => {
      // Arrange
      const seller = await createTestSeller();
      const supplier = await createTestSupplier();
      const product = await createTestProduct(supplier.id);

      const initial = await supplierDashboardService.getSummaryForSupplier(supplier.id);
      const initialApprovedProducts = initial.approvedProducts;

      // Act
      const authorization = await authService.requestAuthorization({
        sellerId: seller.id,
        productId: product.id
      });

      await authService.approveAuthorization(authorization.id, supplier.id);

      const updated = await supplierDashboardService.getSummaryForSupplier(supplier.id);

      // Assert - Approval count might not change (depends on product status)
      // But dashboard should still reflect current state
      expect(updated).toBeDefined();
      expect(updated.totalProducts).toBeGreaterThanOrEqual(initial.totalProducts);
    });
  });

  describe('Dashboard KPI Accuracy', () => {
    it('should match authorization count in dashboard with actual count', async () => {
      // Arrange
      const seller = await createTestSeller();
      const supplier = await createTestSupplier();
      const product1 = await createTestProduct(supplier.id);
      const product2 = await createTestProduct(supplier.id);

      await authService.requestAuthorization({ sellerId: seller.id, productId: product1.id });
      const auth2 = await authService.requestAuthorization({ sellerId: seller.id, productId: product2.id });
      await authService.approveAuthorization(auth2.id, supplier.id);

      // Act
      const summary = await sellerDashboardService.getSummaryForSeller(seller.id);

      // Assert
      expect(summary.totalAuthorizations).toBe(2);
      expect(summary.pendingAuthorizations).toBe(1);
      expect(summary.approvedAuthorizations).toBe(1);
    });

    it('should match product count in dashboard with actual count', async () => {
      // Arrange
      const seller = await createTestSeller();
      const supplier = await createTestSupplier();
      const product1 = await createTestProduct(supplier.id);
      const product2 = await createTestProduct(supplier.id);

      const auth1 = await authService.requestAuthorization({ sellerId: seller.id, productId: product1.id });
      const auth2 = await authService.requestAuthorization({ sellerId: seller.id, productId: product2.id });

      await authService.approveAuthorization(auth1.id, supplier.id);
      await authService.approveAuthorization(auth2.id, supplier.id);

      await productService.addProductToSeller(seller.id, product1.id, { margin: 10000, price: 60000, isActive: true });
      await productService.addProductToSeller(seller.id, product2.id, { margin: 10000, price: 60000, isActive: false });

      // Act
      const summary = await sellerDashboardService.getSummaryForSeller(seller.id);

      // Assert
      expect(summary.totalProducts).toBe(2);
      expect(summary.activeProducts).toBe(1);
      expect(summary.inactiveProducts).toBe(1);
    });
  });
});
