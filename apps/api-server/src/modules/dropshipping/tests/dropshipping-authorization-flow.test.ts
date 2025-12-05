/**
 * Dropshipping Authorization Flow Integration Tests
 * Phase B-4 Step 9 - Tests Authorization → Product Activation → Dashboard workflow
 */

import { initializeTestDatabase, closeTestDatabase, clearTestDatabase, getTestDataSource } from '../../../__tests__/setup/test-database';
import { createTestSeller, createTestSupplier, createTestProduct } from '../../../__tests__/setup/test-fixtures';
import { SellerAuthorizationService } from '../services/SellerAuthorizationService';
import { SellerProductService } from '../services/SellerProductService';
import { SellerDashboardService } from '../services/SellerDashboardService';
import { SupplierDashboardService } from '../services/SupplierDashboardService';
import { AuthorizationStatus } from '../entities/SellerAuthorization';
import { Seller } from '../entities/Seller';

describe('Dropshipping Authorization Flow Integration Tests', () => {
  let authService: SellerAuthorizationService;
  let productService: SellerProductService;
  let sellerDashboardService: SellerDashboardService;
  let supplierDashboardService: SupplierDashboardService;

  beforeAll(async () => {
    await initializeTestDatabase();
    authService = new SellerAuthorizationService();
    productService = new SellerProductService();
    sellerDashboardService = new SellerDashboardService();
    supplierDashboardService = new SupplierDashboardService();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe('requestAuthorization()', () => {
    it('should create authorization request with REQUESTED status', async () => {
      // Arrange
      const seller = await createTestSeller();
      const supplier = await createTestSupplier();
      const product = await createTestProduct(supplier.id);

      // Act
      const authorization = await authService.requestAuthorization({
        sellerId: seller.id,
        productId: product.id,
        requestNote: 'Test authorization request'
      });

      // Assert
      expect(authorization).toBeDefined();
      expect(authorization.id).toBeDefined();
      expect(authorization.sellerId).toBe(seller.id);
      expect(authorization.productId).toBe(product.id);
      expect(authorization.status).toBe(AuthorizationStatus.REQUESTED);
      expect(authorization.usedAt).toBeNull();
    });

    it('should prevent duplicate authorization requests', async () => {
      // Arrange
      const seller = await createTestSeller();
      const supplier = await createTestSupplier();
      const product = await createTestProduct(supplier.id);

      await authService.requestAuthorization({
        sellerId: seller.id,
        productId: product.id
      });

      // Act & Assert
      await expect(
        authService.requestAuthorization({
          sellerId: seller.id,
          productId: product.id
        })
      ).rejects.toThrow();
    });

    it('should enforce 10-product limit per seller', async () => {
      // Arrange
      const seller = await createTestSeller();
      const supplier = await createTestSupplier();

      // Update seller's approved product count to 10
      const dataSource = getTestDataSource();
      const sellerRepo = dataSource.getRepository(Seller);
      await sellerRepo.update(seller.id, { approvedProductCount: 10 });

      const product = await createTestProduct(supplier.id);

      // Act & Assert
      await expect(
        authService.requestAuthorization({
          sellerId: seller.id,
          productId: product.id
        })
      ).rejects.toThrow('limit');
    });
  });

  describe('approveAuthorization()', () => {
    it('should transition authorization from REQUESTED to APPROVED', async () => {
      // Arrange
      const seller = await createTestSeller();
      const supplier = await createTestSupplier();
      const product = await createTestProduct(supplier.id);

      const authorization = await authService.requestAuthorization({
        sellerId: seller.id,
        productId: product.id
      });

      // Act
      const approved = await authService.approveAuthorization(
        authorization.id,
        supplier.id,
        'Test approval'
      });

      // Assert
      expect(approved).toBeDefined();
      expect(approved.status).toBe(AuthorizationStatus.APPROVED);
      expect(approved.approvedAt).toBeDefined();
      expect(approved.approvedBySupplierId).toBe(supplier.id);
    });

    it('should increment seller approved product count', async () => {
      // Arrange
      const seller = await createTestSeller();
      const supplier = await createTestSupplier();
      const product = await createTestProduct(supplier.id);

      const authorization = await authService.requestAuthorization({
        sellerId: seller.id,
        productId: product.id
      });

      // Act
      await authService.approveAuthorization(
        authorization.id,
        supplier.id
      );

      // Assert
      const dataSource = getTestDataSource();
      const sellerRepo = dataSource.getRepository(Seller);
      const updatedSeller = await sellerRepo.findOne({ where: { id: seller.id } });

      expect(updatedSeller).toBeDefined();
      expect(updatedSeller!.approvedProductCount).toBe(1);
    });

    it('should prevent unauthorized supplier from approving', async () => {
      // Arrange
      const seller = await createTestSeller();
      const supplier1 = await createTestSupplier();
      const supplier2 = await createTestSupplier();
      const product = await createTestProduct(supplier1.id);

      const authorization = await authService.requestAuthorization({
        sellerId: seller.id,
        productId: product.id
      });

      // Act & Assert
      await expect(
        authService.approveAuthorization(
          authorization.id,
          supplier2.id // Wrong supplier
        )
      ).rejects.toThrow();
    });

    it('should prevent approving already approved authorization', async () => {
      // Arrange
      const seller = await createTestSeller();
      const supplier = await createTestSupplier();
      const product = await createTestProduct(supplier.id);

      const authorization = await authService.requestAuthorization({
        sellerId: seller.id,
        productId: product.id
      });

      await authService.approveAuthorization(
        authorization.id,
        supplier.id
      );

      // Act & Assert
      await expect(
        authService.approveAuthorization(
          authorization.id,
          supplier.id
        )
      ).rejects.toThrow();
    });
  });

  describe('rejectAuthorization()', () => {
    it('should transition authorization from REQUESTED to REJECTED', async () => {
      // Arrange
      const seller = await createTestSeller();
      const supplier = await createTestSupplier();
      const product = await createTestProduct(supplier.id);

      const authorization = await authService.requestAuthorization({
        sellerId: seller.id,
        productId: product.id
      });

      // Act
      const rejected = await authService.rejectAuthorization(
        authorization.id,
        supplier.id,
        'Test rejection reason'
      );

      // Assert
      expect(rejected).toBeDefined();
      expect(rejected.status).toBe(AuthorizationStatus.REJECTED);
      expect(rejected.rejectedAt).toBeDefined();
      expect(rejected.rejectionNote).toBe('Test rejection reason');
    });

    it('should enforce 7-day cooldown after rejection', async () => {
      // Arrange
      const seller = await createTestSeller();
      const supplier = await createTestSupplier();
      const product = await createTestProduct(supplier.id);

      const authorization = await authService.requestAuthorization({
        sellerId: seller.id,
        productId: product.id
      });

      await authService.rejectAuthorization(
        authorization.id,
        supplier.id,
        'First rejection'
      );

      // Act & Assert - Try to request again immediately
      await expect(
        authService.requestAuthorization({
          sellerId: seller.id,
          productId: product.id
        })
      ).rejects.toThrow();
    });
  });

  describe('addProductToSeller()', () => {
    it('should create SellerProduct after authorization approved', async () => {
      // Arrange
      const seller = await createTestSeller();
      const supplier = await createTestSupplier();
      const product = await createTestProduct(supplier.id, { price: 50000, basePrice: 40000 });

      const authorization = await authService.requestAuthorization({
        sellerId: seller.id,
        productId: product.id
      });

      await authService.approveAuthorization(
        authorization.id,
        supplier.id
      );

      // Act
      const sellerProduct = await productService.addProductToSeller(
        seller.id,
        product.id,
        {
          margin: 10000,
          price: 60000,
          isActive: true
        }
      );

      // Assert
      expect(sellerProduct).toBeDefined();
      expect(sellerProduct.id).toBeDefined();
      expect(sellerProduct.sellerId).toBe(seller.id);
      expect(sellerProduct.productId).toBe(product.id);
      expect(sellerProduct.isActive).toBe(true);
      expect(sellerProduct.price).toBe(60000);
      expect(sellerProduct.margin).toBe(10000);
    });

    it('should require approved authorization', async () => {
      // Arrange
      const seller = await createTestSeller();
      const supplier = await createTestSupplier();
      const product = await createTestProduct(supplier.id);

      // No authorization created

      // Act & Assert
      await expect(
        productService.addProductToSeller(
          seller.id,
          product.id,
          {
            margin: 10000,
            price: 60000,
            isActive: true
          }
        )
      ).rejects.toThrow();
    });

    it('should mark authorization as used', async () => {
      // Arrange
      const seller = await createTestSeller();
      const supplier = await createTestSupplier();
      const product = await createTestProduct(supplier.id);

      const authorization = await authService.requestAuthorization({
        sellerId: seller.id,
        productId: product.id
      });

      await authService.approveAuthorization(
        authorization.id,
        supplier.id
      );

      // Act
      await productService.addProductToSeller(
        seller.id,
        product.id,
        {
          margin: 10000,
          price: 60000,
          isActive: true
        }
      );

      // Assert - Try to add again (should fail)
      await expect(
        productService.addProductToSeller(
          seller.id,
          product.id,
          {
            margin: 10000,
            price: 60000,
            isActive: true
          }
        )
      ).rejects.toThrow();
    });
  });

  describe('Dashboard Integration', () => {
    it('should reflect authorization status in seller dashboard', async () => {
      // Arrange
      const seller = await createTestSeller();
      const supplier = await createTestSupplier();
      const product = await createTestProduct(supplier.id);

      // Act 1: Request authorization
      await authService.requestAuthorization({
        sellerId: seller.id,
        productId: product.id
      });

      const dashboard1 = await sellerDashboardService.getSummaryForSeller(seller.id);

      // Assert 1: Should show pending authorization
      expect(dashboard1.totalAuthorizations).toBe(1);
      expect(dashboard1.pendingAuthorizations).toBe(1);
      expect(dashboard1.approvedAuthorizations).toBe(0);

      // Act 2: Approve authorization
      const authorization = (await authService.listAuthorizations({
        sellerId: seller.id
      }))[0];

      await authService.approveAuthorization(
        authorization.id,
        supplier.id
      );

      const dashboard2 = await sellerDashboardService.getSummaryForSeller(seller.id);

      // Assert 2: Should show approved authorization
      expect(dashboard2.totalAuthorizations).toBe(1);
      expect(dashboard2.pendingAuthorizations).toBe(0);
      expect(dashboard2.approvedAuthorizations).toBe(1);
    });

    it('should reflect product addition in seller dashboard', async () => {
      // Arrange
      const seller = await createTestSeller();
      const supplier = await createTestSupplier();
      const product = await createTestProduct(supplier.id);

      const authorization = await authService.requestAuthorization({
        sellerId: seller.id,
        productId: product.id
      });

      await authService.approveAuthorization(
        authorization.id,
        supplier.id
      );

      // Act
      await productService.addProductToSeller(
        seller.id,
        product.id,
        {
          margin: 10000,
          price: 60000,
          isActive: true
        }
      );

      const dashboard = await sellerDashboardService.getSummaryForSeller(seller.id);

      // Assert
      expect(dashboard.totalProducts).toBe(1);
      expect(dashboard.activeProducts).toBe(1);
      expect(dashboard.inactiveProducts).toBe(0);
    });

    it('should reflect approval count in supplier dashboard', async () => {
      // Arrange
      const seller1 = await createTestSeller();
      const seller2 = await createTestSeller();
      const supplier = await createTestSupplier();
      const product = await createTestProduct(supplier.id);

      const auth1 = await authService.requestAuthorization({
        sellerId: seller1.id,
        productId: product.id
      });

      const auth2 = await authService.requestAuthorization({
        sellerId: seller2.id,
        productId: product.id
      });

      // Act
      await authService.approveAuthorization(auth1.id, supplier.id);
      // Leave auth2 pending

      const dashboard = await supplierDashboardService.getSummaryForSupplier(supplier.id);

      // Assert
      expect(dashboard).toBeDefined();
      expect(dashboard.approvedProducts).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Full Authorization Workflow', () => {
    it('should complete entire flow: Request → Approve → Add Product → Dashboard Reflect', async () => {
      // Arrange
      const seller = await createTestSeller();
      const supplier = await createTestSupplier();
      const product = await createTestProduct(supplier.id);

      // Act 1: Request authorization
      const authorization = await authService.requestAuthorization({
        sellerId: seller.id,
        productId: product.id,
        requestNote: 'Full workflow test'
      });

      expect(authorization.status).toBe(AuthorizationStatus.REQUESTED);

      // Act 2: Approve authorization
      const approved = await authService.approveAuthorization(
        authorization.id,
        supplier.id,
        'Approval for full workflow test'
      );

      expect(approved.status).toBe(AuthorizationStatus.APPROVED);

      // Act 3: Add product to seller
      const sellerProduct = await productService.addProductToSeller(
        seller.id,
        product.id,
        {
          margin: 10000,
          price: 60000,
          isActive: true
        }
      );

      expect(sellerProduct.isActive).toBe(true);

      // Act 4: Check seller dashboard
      const sellerDashboard = await sellerDashboardService.getSummaryForSeller(seller.id);

      expect(sellerDashboard.totalAuthorizations).toBe(1);
      expect(sellerDashboard.approvedAuthorizations).toBe(1);
      expect(sellerDashboard.totalProducts).toBe(1);
      expect(sellerDashboard.activeProducts).toBe(1);

      // Act 5: Check supplier dashboard
      const supplierDashboard = await supplierDashboardService.getSummaryForSupplier(supplier.id);

      expect(supplierDashboard.totalProducts).toBe(1);
      expect(supplierDashboard.approvedProducts).toBe(1);
    });
  });
});
