/**
 * Phase B-4 Steps 7-8: Simplified Workflow Testing
 *
 * Tests core settlement workflow without full E2E infrastructure
 */

import AppDataSource from '../src/database/data-source.js';
import { SettlementManagementService } from '../src/modules/dropshipping/services/SettlementManagementService.js';
import { SettlementReadService } from '../src/modules/commerce/services/SettlementReadService.js';
import { Order } from '../src/modules/commerce/entities/Order.js';
import { OrderItem as OrderItemEntity } from '../src/modules/commerce/entities/OrderItem.js';
import { User } from '../src/entities/User.js';
import { OrderStatus, PaymentStatus } from '../src/modules/commerce/entities/Order.js';
import logger from '../src/utils/logger.js';

async function main() {
  try {
    logger.info('🚀 Phase B-4 Steps 7-8: Simplified Settlement Workflow Test');
    logger.info('='.repeat(80));

    await AppDataSource.initialize();
    logger.info('✅ Database connected');

    const settlementMgmtService = new SettlementManagementService();
    const settlementReadService = new SettlementReadService();

    // Test 1: Find existing order with items
    logger.info('\n📦 Test 1: Finding existing order with completed payment');

    const orderRepo = AppDataSource.getRepository(Order);
    const orders = await orderRepo.find({
      where: { paymentStatus: PaymentStatus.COMPLETED },
      relations: ['itemsRelation'],
      take: 1
    });

    if (orders.length === 0) {
      logger.warn('⚠️  No completed orders found in database');
      logger.info('💡 Creating a test order...');

      // Create minimal test order
      const userRepo = AppDataSource.getRepository(User);
      const orderItemRepo = AppDataSource.getRepository(OrderItemEntity);

      const testUser = await userRepo.save({
        username: `test_buyer_workflow_${Date.now()}`,
        email: `workflow_test_${Date.now()}@test.com`,
        password: 'test123',
        role: 'buyer'
      });

      const testOrder = await orderRepo.save({
        orderNumber: `WORKFLOW-TEST-${Date.now()}`,
        buyerId: testUser.id,
        buyerName: 'Workflow Test Buyer',
        buyerEmail: testUser.email,
        buyerGrade: 'BRONZE',
        orderDate: new Date(),
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.COMPLETED,
        billingAddress: {
          recipientName: 'Test',
          phone: '010-0000-0000',
          zipCode: '12345',
          address: 'Test Address',
          detailAddress: '',
          city: 'Seoul',
          country: 'KR'
        },
        shippingAddress: {
          recipientName: 'Test',
          phone: '010-0000-0000',
          zipCode: '12345',
          address: 'Test Address',
          detailAddress: '',
          city: 'Seoul',
          country: 'KR'
        },
        summary: {
          subtotal: 100000,
          discount: 0,
          shipping: 3000,
          tax: 0,
          total: 103000
        }
      });

      // Create test order item
      await orderItemRepo.save({
        orderId: testOrder.id,
        productId: '00000000-0000-0000-0000-000000000001', // Placeholder
        sellerId: '00000000-0000-0000-0000-000000000002', // Placeholder
        supplierId: '00000000-0000-0000-0000-000000000003', // Placeholder
        productName: 'Test Product',
        productSku: 'TEST-SKU',
        productImage: 'test.jpg',
        quantity: 2,
        unitPrice: 50000,
        basePriceSnapshot: 40000,
        totalPrice: 100000,
        commissionAmount: 20000 // 20%
      });

      logger.info('✅ Test order created:', testOrder.orderNumber);

      // Reload with items
      const reloaded = await orderRepo.findOne({
        where: { id: testOrder.id },
        relations: ['itemsRelation']
      });

      if (reloaded) {
        orders.push(reloaded);
      }
    }

    const testOrder = orders[0];
    logger.info(`✅ Found order: ${testOrder.orderNumber}`);
    logger.info(`   Items count: ${testOrder.itemsRelation?.length || 0}`);

    // Test 2: Generate Settlement
    logger.info('\n💰 Test 2: Generating settlement for order');

    try {
      const settlementResult = await settlementMgmtService.generateSettlement(testOrder.id);

      logger.info('✅ Settlement generated successfully!');
      logger.info(`   Settlements created: ${settlementResult.settlements.length}`);
      logger.info(`   Settlement items created: ${settlementResult.settlementItems.length}`);

      if (settlementResult.settlements.length > 0) {
        logger.info('\n📊 Settlement Details:');
        for (const settlement of settlementResult.settlements) {
          logger.info(`   - ${settlement.partyType}: ${settlement.payableAmount} KRW (${settlement.status})`);
        }
      }

      // Test 3: Finalize Settlement
      if (settlementResult.settlements.length > 0) {
        const firstSettlement = settlementResult.settlements[0];
        logger.info(`\n✅ Test 3: Finalizing settlement ${firstSettlement.id}`);

        try {
          const finalized = await settlementMgmtService.finalizeSettlement(firstSettlement.id);
          logger.info(`✅ Settlement finalized: ${finalized.status}`);
        } catch (error) {
          logger.error(`❌ Settlement finalization failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

    } catch (error) {
      logger.error(`❌ Settlement generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Test 4: Settlement Overview
    logger.info('\n📊 Test 4: Checking settlement overview');

    try {
      const overview = await settlementReadService.getSettlementOverview();

      logger.info('✅ Settlement Overview:');
      logger.info(`   Total Settlements: ${overview.totalSettlements}`);
      logger.info(`   Total Pending: ${overview.totalPendingAmount} KRW`);
      logger.info(`   Total Processing: ${overview.totalProcessingAmount} KRW`);
      logger.info(`   Total Paid: ${overview.totalPaidAmount} KRW`);
      logger.info(`   By Party Type: ${JSON.stringify(overview.settlementsByPartyType)}`);
      logger.info(`   By Status: ${JSON.stringify(overview.settlementsByStatus)}`);
    } catch (error) {
      logger.error(`❌ Settlement overview failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Test 5: Daily Settlement Totals
    logger.info('\n📈 Test 5: Checking daily settlement totals');

    try {
      const now = new Date();
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const dailyTotals = await settlementReadService.getDailySettlementTotals({
        from: lastMonth,
        to: now
      });

      logger.info(`✅ Daily Settlement Totals (last 30 days): ${dailyTotals.length} days with data`);

      if (dailyTotals.length > 0) {
        const recentDays = dailyTotals.slice(-5);
        logger.info('   Recent activity:');
        for (const day of recentDays) {
          logger.info(`   - ${day.date}: ${day.totalAmount} KRW (${day.totalSettlements} settlements)`);
        }
      }
    } catch (error) {
      logger.error(`❌ Daily settlement totals failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    logger.info('\n' + '='.repeat(80));
    logger.info('🎉 Settlement Workflow Test Complete!');
    logger.info('='.repeat(80));

    await AppDataSource.destroy();
    process.exit(0);

  } catch (error) {
    logger.error('💥 Fatal error:', error);
    await AppDataSource.destroy();
    process.exit(1);
  }
}

main();
