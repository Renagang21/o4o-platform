/**
 * Phase B-4 Steps 7-8: E2E Workflow Testing
 *
 * Tests complete pipeline:
 * 1. Authorization → Product Activation → Dashboard (Step 7)
 * 2. Commerce → Order → Settlement → Dashboard (Step 8)
 */

import AppDataSource from '../src/database/data-source.js';
import { SellerAuthorizationService } from '../src/modules/dropshipping/services/SellerAuthorizationService.js';
import { SellerProductService } from '../src/modules/dropshipping/services/SellerProductService.js';
import { SellerService } from '../src/modules/dropshipping/services/SellerService.js';
import { SupplierService } from '../src/modules/dropshipping/services/SupplierService.js';
import { SellerDashboardService } from '../src/modules/dropshipping/services/SellerDashboardService.js';
import { SupplierDashboardService } from '../src/modules/dropshipping/services/SupplierDashboardService.js';
import { SettlementManagementService } from '../src/modules/dropshipping/services/SettlementManagementService.js';
import { SettlementReadService } from '../src/modules/commerce/services/SettlementReadService.js';
import { OrderService } from '../src/modules/commerce/services/OrderService.js';
import { Product } from '../src/modules/commerce/entities/Product.js';
import { User } from '../src/entities/User.js';
import { Seller } from '../src/modules/dropshipping/entities/Seller.js';
import { Supplier } from '../src/modules/dropshipping/entities/Supplier.js';
import { Order, OrderStatus, PaymentStatus } from '../src/modules/commerce/entities/Order.js';
import { OrderItem as OrderItemEntity } from '../src/modules/commerce/entities/OrderItem.js';
import logger from '../src/utils/logger.js';

interface TestResults {
  step7: {
    success: boolean;
    authorizationCreated: boolean;
    authorizationApproved: boolean;
    productAdded: boolean;
    dashboardUpdated: boolean;
    errors: string[];
  };
  step8: {
    success: boolean;
    orderCreated: boolean;
    settlementGenerated: boolean;
    settlementFinalized: boolean;
    dashboardKPIsCorrect: boolean;
    errors: string[];
  };
}

class E2EWorkflowTester {
  private authService: SellerAuthorizationService;
  private productService: SellerProductService;
  private sellerService: SellerService;
  private supplierService: SupplierService;
  private sellerDashboardService: SellerDashboardService;
  private supplierDashboardService: SupplierDashboardService;
  private settlementMgmtService: SettlementManagementService;
  private settlementReadService: SettlementReadService;
  private orderService: OrderService;

  private testSellerId?: string;
  private testSupplierId?: string;
  private testProductId?: string;
  private testOrderId?: string;
  private testSettlementId?: string;

  constructor() {
    this.authService = new SellerAuthorizationService();
    this.productService = new SellerProductService();
    this.sellerService = new SellerService();
    this.supplierService = new SupplierService();
    this.sellerDashboardService = new SellerDashboardService();
    this.supplierDashboardService = new SupplierDashboardService();
    this.settlementMgmtService = new SettlementManagementService();
    this.settlementReadService = new SettlementReadService();
    this.orderService = new OrderService();
  }

  async runTests(): Promise<TestResults> {
    const results: TestResults = {
      step7: {
        success: false,
        authorizationCreated: false,
        authorizationApproved: false,
        productAdded: false,
        dashboardUpdated: false,
        errors: []
      },
      step8: {
        success: false,
        orderCreated: false,
        settlementGenerated: false,
        settlementFinalized: false,
        dashboardKPIsCorrect: false,
        errors: []
      }
    };

    try {
      await this.setupTestData();

      // Step 7: Authorization → Product Activation
      logger.info('🧪 Starting Step 7: Authorization & Product Activation E2E Test');
      await this.testStep7(results.step7);

      // Step 8: Commerce → Order → Settlement
      logger.info('🧪 Starting Step 8: Commerce Workflow E2E Test');
      await this.testStep8(results.step8);

      await this.cleanup();
    } catch (error) {
      logger.error('❌ E2E Test fatal error:', error);
      throw error;
    }

    return results;
  }

  private async setupTestData(): Promise<void> {
    logger.info('🔧 Setting up test data...');

    const userRepo = AppDataSource.getRepository(User);
    const sellerRepo = AppDataSource.getRepository(Seller);
    const supplierRepo = AppDataSource.getRepository(Supplier);
    const productRepo = AppDataSource.getRepository(Product);

    // Create test seller user
    const sellerUser = await userRepo.save({
      username: `test_seller_${Date.now()}`,
      email: `seller_${Date.now()}@test.com`,
      password: 'test123',
      role: 'seller'
    });

    // Create test seller
    const seller = await sellerRepo.save({
      userId: sellerUser.id,
      businessName: 'Test Seller Business',
      businessNumber: '123-45-67890',
      contactEmail: sellerUser.email,
      contactPhone: '010-1234-5678',
      status: 'ACTIVE',
      approvedProductCount: 0
    });
    this.testSellerId = seller.id;

    // Create test supplier user
    const supplierUser = await userRepo.save({
      username: `test_supplier_${Date.now()}`,
      email: `supplier_${Date.now()}@test.com`,
      password: 'test123',
      role: 'supplier'
    });

    // Create test supplier
    const supplier = await supplierRepo.save({
      userId: supplierUser.id,
      companyName: 'Test Supplier Co.',
      businessNumber: '987-65-43210',
      contactEmail: supplierUser.email,
      contactPhone: '010-9876-5432',
      status: 'ACTIVE'
    });
    this.testSupplierId = supplier.id;

    // Create test product
    const product = await productRepo.save({
      supplierId: this.testSupplierId,
      name: 'Test Product for E2E',
      description: 'Test product for E2E workflow testing',
      price: 50000,
      basePrice: 40000,
      status: 'ACTIVE',
      inventory: 100,
      trackInventory: true,
      lowStockThreshold: 10
    });
    this.testProductId = product.id;

    logger.info('✅ Test data setup complete', {
      sellerId: this.testSellerId,
      supplierId: this.testSupplierId,
      productId: this.testProductId
    });
  }

  private async testStep7(results: typeof TestResults['step7']): Promise<void> {
    try {
      // 1. Request Authorization
      logger.info('📝 Step 7.1: Requesting authorization');
      const authorization = await this.authService.requestAuthorization({
        sellerId: this.testSellerId!,
        productId: this.testProductId!,
        requestNote: 'E2E test authorization request'
      });

      if (authorization && authorization.id) {
        results.authorizationCreated = true;
        logger.info('✅ Authorization created:', authorization.id);
      } else {
        results.errors.push('Authorization creation failed');
        return;
      }

      // 2. Approve Authorization
      logger.info('✅ Step 7.2: Approving authorization');
      const approved = await this.authService.approveAuthorization(
        authorization.id,
        this.testSupplierId!,
        'E2E test approval'
      );

      if (approved && approved.status === 'APPROVED') {
        results.authorizationApproved = true;
        logger.info('✅ Authorization approved');
      } else {
        results.errors.push('Authorization approval failed');
        return;
      }

      // 3. Add Product to Seller
      logger.info('🛒 Step 7.3: Adding product to seller');
      const sellerProduct = await this.productService.addProductToSeller(
        this.testSellerId!,
        this.testProductId!,
        {
          margin: 5000,
          price: 55000,
          isActive: true
        }
      );

      if (sellerProduct && sellerProduct.id) {
        results.productAdded = true;
        logger.info('✅ Product added to seller:', sellerProduct.id);
      } else {
        results.errors.push('Product addition failed');
        return;
      }

      // 4. Verify Dashboard Updates
      logger.info('📊 Step 7.4: Verifying dashboard updates');

      const sellerDashboard = await this.sellerDashboardService.getSummaryForSeller(
        this.testSellerId!
      );

      const supplierDashboard = await this.supplierDashboardService.getSummaryForSupplier(
        this.testSupplierId!
      );

      logger.info('Seller Dashboard:', {
        totalProducts: sellerDashboard.totalProducts,
        activeProducts: sellerDashboard.activeProducts,
        totalAuthorizations: sellerDashboard.totalAuthorizations,
        approvedAuthorizations: sellerDashboard.approvedAuthorizations
      });

      logger.info('Supplier Dashboard:', {
        totalProducts: supplierDashboard.totalProducts,
        approvedProducts: supplierDashboard.approvedProducts
      });

      // Check if dashboard reflects the changes
      if (sellerDashboard.totalProducts >= 1 &&
          sellerDashboard.approvedAuthorizations >= 1) {
        results.dashboardUpdated = true;
        logger.info('✅ Dashboard KPIs updated correctly');
      } else {
        results.errors.push('Dashboard not updated correctly');
      }

      results.success = results.authorizationCreated &&
                       results.authorizationApproved &&
                       results.productAdded &&
                       results.dashboardUpdated;

      if (results.success) {
        logger.info('🎉 Step 7 PASSED: Authorization & Product Activation workflow complete');
      }

    } catch (error) {
      results.errors.push(`Step 7 error: ${error instanceof Error ? error.message : String(error)}`);
      logger.error('❌ Step 7 failed:', error);
    }
  }

  private async testStep8(results: typeof TestResults['step8']): Promise<void> {
    try {
      // 1. Create Order
      logger.info('🛍️ Step 8.1: Creating test order');

      const orderRepo = AppDataSource.getRepository(Order);
      const orderItemRepo = AppDataSource.getRepository(OrderItemEntity);
      const userRepo = AppDataSource.getRepository(User);

      // Create test buyer
      const buyer = await userRepo.save({
        username: `test_buyer_${Date.now()}`,
        email: `buyer_${Date.now()}@test.com`,
        password: 'test123',
        role: 'buyer'
      });

      const order = await orderRepo.save({
        orderNumber: `TEST-${Date.now()}`,
        buyerId: buyer.id,
        buyerName: 'Test Buyer',
        buyerEmail: buyer.email,
        buyerGrade: 'BRONZE',
        orderDate: new Date(),
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.COMPLETED,
        billingAddress: {
          recipientName: 'Test Buyer',
          phone: '010-1111-2222',
          zipCode: '12345',
          address: 'Test Address',
          detailAddress: 'Suite 100',
          city: 'Seoul',
          country: 'KR'
        },
        shippingAddress: {
          recipientName: 'Test Buyer',
          phone: '010-1111-2222',
          zipCode: '12345',
          address: 'Test Address',
          detailAddress: 'Suite 100',
          city: 'Seoul',
          country: 'KR'
        },
        summary: {
          subtotal: 110000,
          discount: 0,
          shipping: 3000,
          tax: 0,
          total: 113000
        }
      });

      const orderItem = await orderItemRepo.save({
        orderId: order.id,
        productId: this.testProductId!,
        sellerId: this.testSellerId!,
        supplierId: this.testSupplierId!,
        productName: 'Test Product',
        productSku: 'TEST-SKU',
        productImage: 'test.jpg',
        quantity: 2,
        unitPrice: 55000,
        basePriceSnapshot: 40000,
        totalPrice: 110000,
        commissionAmount: 20000 // 20% of 100000
      });

      this.testOrderId = order.id;

      if (order && order.id) {
        results.orderCreated = true;
        logger.info('✅ Order created:', order.orderNumber);
      } else {
        results.errors.push('Order creation failed');
        return;
      }

      // 2. Generate Settlement
      logger.info('💰 Step 8.2: Generating settlement');
      const settlementResult = await this.settlementMgmtService.generateSettlement(
        this.testOrderId
      );

      if (settlementResult && settlementResult.settlements.length > 0) {
        results.settlementGenerated = true;
        this.testSettlementId = settlementResult.settlements[0].id;

        logger.info('✅ Settlement generated:', {
          settlementsCount: settlementResult.settlements.length,
          itemsCount: settlementResult.settlementItems.length,
          parties: settlementResult.settlements.map(s => ({
            partyType: s.partyType,
            partyId: s.partyId,
            amount: s.payableAmount
          }))
        });
      } else {
        results.errors.push('Settlement generation failed');
        return;
      }

      // 3. Finalize Settlement
      logger.info('✅ Step 8.3: Finalizing settlement');
      const finalizedSettlement = await this.settlementMgmtService.finalizeSettlement(
        this.testSettlementId
      );

      if (finalizedSettlement && finalizedSettlement.status === 'PROCESSING') {
        results.settlementFinalized = true;
        logger.info('✅ Settlement finalized:', finalizedSettlement.status);
      } else {
        results.errors.push('Settlement finalization failed');
        return;
      }

      // 4. Verify Settlement KPIs
      logger.info('📊 Step 8.4: Verifying settlement KPIs');

      const settlementOverview = await this.settlementReadService.getSettlementOverview();

      logger.info('Settlement Overview:', {
        totalSettlements: settlementOverview.totalSettlements,
        totalPendingAmount: settlementOverview.totalPendingAmount,
        totalProcessingAmount: settlementOverview.totalProcessingAmount,
        totalPaidAmount: settlementOverview.totalPaidAmount,
        settlementsByPartyType: settlementOverview.settlementsByPartyType
      });

      // Check if settlement KPIs are correct
      if (settlementOverview.totalSettlements >= settlementResult.settlements.length) {
        results.dashboardKPIsCorrect = true;
        logger.info('✅ Settlement KPIs updated correctly');
      } else {
        results.errors.push('Settlement KPIs not updated correctly');
      }

      results.success = results.orderCreated &&
                       results.settlementGenerated &&
                       results.settlementFinalized &&
                       results.dashboardKPIsCorrect;

      if (results.success) {
        logger.info('🎉 Step 8 PASSED: Commerce workflow complete');
      }

    } catch (error) {
      results.errors.push(`Step 8 error: ${error instanceof Error ? error.message : String(error)}`);
      logger.error('❌ Step 8 failed:', error);
    }
  }

  private async cleanup(): Promise<void> {
    logger.info('🧹 Cleaning up test data...');
    // Note: In a real scenario, you'd delete test data here
    // For now, we'll leave it for manual inspection
    logger.info('✅ Cleanup complete (test data preserved for inspection)');
  }
}

// Main execution
async function main() {
  try {
    logger.info('🚀 Starting Phase B-4 Steps 7-8 E2E Workflow Testing');

    await AppDataSource.initialize();
    logger.info('✅ Database connected');

    const tester = new E2EWorkflowTester();
    const results = await tester.runTests();

    // Print final results
    logger.info('\n' + '='.repeat(80));
    logger.info('📊 E2E WORKFLOW TEST RESULTS');
    logger.info('='.repeat(80));

    logger.info('\n📌 Step 7: Authorization & Product Activation');
    logger.info(`   Success: ${results.step7.success ? '✅' : '❌'}`);
    logger.info(`   - Authorization Created: ${results.step7.authorizationCreated ? '✅' : '❌'}`);
    logger.info(`   - Authorization Approved: ${results.step7.authorizationApproved ? '✅' : '❌'}`);
    logger.info(`   - Product Added: ${results.step7.productAdded ? '✅' : '❌'}`);
    logger.info(`   - Dashboard Updated: ${results.step7.dashboardUpdated ? '✅' : '❌'}`);
    if (results.step7.errors.length > 0) {
      logger.error(`   Errors: ${results.step7.errors.join(', ')}`);
    }

    logger.info('\n📌 Step 8: Commerce Workflow');
    logger.info(`   Success: ${results.step8.success ? '✅' : '❌'}`);
    logger.info(`   - Order Created: ${results.step8.orderCreated ? '✅' : '❌'}`);
    logger.info(`   - Settlement Generated: ${results.step8.settlementGenerated ? '✅' : '❌'}`);
    logger.info(`   - Settlement Finalized: ${results.step8.settlementFinalized ? '✅' : '❌'}`);
    logger.info(`   - Dashboard KPIs Correct: ${results.step8.dashboardKPIsCorrect ? '✅' : '❌'}`);
    if (results.step8.errors.length > 0) {
      logger.error(`   Errors: ${results.step8.errors.join(', ')}`);
    }

    logger.info('\n' + '='.repeat(80));

    const overallSuccess = results.step7.success && results.step8.success;
    if (overallSuccess) {
      logger.info('🎉 ALL E2E TESTS PASSED!');
    } else {
      logger.error('❌ SOME E2E TESTS FAILED');
    }

    await AppDataSource.destroy();
    process.exit(overallSuccess ? 0 : 1);

  } catch (error) {
    logger.error('💥 Fatal error in E2E test:', error);
    process.exit(1);
  }
}

main();
