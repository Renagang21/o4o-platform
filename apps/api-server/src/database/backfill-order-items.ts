/**
 * R-8-3-1: OrderItem Backfill Script
 *
 * Migrates existing order items from JSONB (Order.items) to OrderItem entities
 *
 * Features:
 * - Batch processing for memory efficiency
 * - Transaction safety (rollback on error)
 * - Idempotent (can be run multiple times safely)
 * - Progress logging
 * - Error handling and reporting
 *
 * Usage:
 *   # Dry run (check without writing):
 *   npm run backfill:order-items -- --dry-run
 *
 *   # Actual backfill:
 *   npm run backfill:order-items
 *
 *   # Custom batch size:
 *   npm run backfill:order-items -- --batch-size=100
 */

import { AppDataSource } from './connection.js';
import { Order } from '../entities/Order.js';
import { OrderItem as OrderItemEntity } from '../entities/OrderItem.js';
import { OrderItem as OrderItemInterface } from '../entities/Order.js';

interface BackfillStats {
  totalOrders: number;
  processedOrders: number;
  totalItems: number;
  createdItems: number;
  skippedItems: number;
  errors: number;
  startTime: Date;
  endTime?: Date;
}

interface BackfillOptions {
  batchSize: number;
  dryRun: boolean;
}

class OrderItemBackfillService {
  private stats: BackfillStats = {
    totalOrders: 0,
    processedOrders: 0,
    totalItems: 0,
    createdItems: 0,
    skippedItems: 0,
    errors: 0,
    startTime: new Date()
  };

  /**
   * Main backfill execution
   */
  async backfillAll(options: BackfillOptions): Promise<void> {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║         R-8-3-1: OrderItem Backfill Script              ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    if (options.dryRun) {
      console.log('🔍 DRY RUN MODE - No data will be written\n');
    }

    try {
      // Initialize database
      if (!AppDataSource.isInitialized) {
        console.log('📡 Initializing database connection...');
        await AppDataSource.initialize();
      }

      const orderRepo = AppDataSource.getRepository(Order);
      const orderItemRepo = AppDataSource.getRepository(OrderItemEntity);

      // Count total orders
      this.stats.totalOrders = await orderRepo.count();
      console.log(`📊 Total orders in database: ${this.stats.totalOrders}\n`);

      if (this.stats.totalOrders === 0) {
        console.log('✅ No orders found. Nothing to backfill.');
        return;
      }

      // Process in batches
      const batchSize = options.batchSize;
      const totalBatches = Math.ceil(this.stats.totalOrders / batchSize);
      let currentBatch = 0;

      for (let offset = 0; offset < this.stats.totalOrders; offset += batchSize) {
        currentBatch++;
        console.log(`\n📦 Processing batch ${currentBatch}/${totalBatches} (offset: ${offset}, size: ${batchSize})`);

        // Fetch batch of orders
        const orders = await orderRepo.find({
          skip: offset,
          take: batchSize,
          order: { createdAt: 'ASC' }
        });

        // Process each order in transaction
        for (const order of orders) {
          try {
            await this.backfillOrder(order, orderItemRepo, options.dryRun);
            this.stats.processedOrders++;
          } catch (error: any) {
            console.error(`❌ Error processing order ${order.orderNumber}:`, error.message);
            this.stats.errors++;
          }
        }

        // Progress update
        const progress = ((offset + batchSize) / this.stats.totalOrders * 100).toFixed(1);
        console.log(`   Progress: ${progress}% (${this.stats.processedOrders}/${this.stats.totalOrders} orders)`);
      }

      this.stats.endTime = new Date();
      this.printSummary();

    } catch (error: any) {
      console.error('\n❌ Backfill failed:', error.message);
      console.error(error.stack);
      throw error;
    }
  }

  /**
   * Backfill a single order
   */
  private async backfillOrder(
    order: Order,
    orderItemRepo: any,
    dryRun: boolean
  ): Promise<void> {
    const items: OrderItemInterface[] = order.items || [];

    if (items.length === 0) {
      console.log(`⚠️  Order ${order.orderNumber} has no items, skipping`);
      return;
    }

    this.stats.totalItems += items.length;

    // Use transaction for atomicity
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const item of items) {
        // Check if item already exists (idempotency)
        const existing = await queryRunner.manager.findOne(OrderItemEntity, {
          where: {
            orderId: order.id,
            productId: item.productId,
            sellerId: item.sellerId
          }
        });

        if (existing) {
          this.stats.skippedItems++;
          continue;
        }

        // Create OrderItem entity from JSONB
        const orderItem = new OrderItemEntity();
        orderItem.orderId = order.id;
        orderItem.productId = item.productId;
        orderItem.productName = item.productName;
        orderItem.productSku = item.productSku;
        orderItem.quantity = item.quantity;
        orderItem.unitPrice = item.unitPrice;
        orderItem.totalPrice = item.totalPrice;
        orderItem.supplierId = item.supplierId;
        orderItem.supplierName = item.supplierName;
        orderItem.sellerId = item.sellerId;
        orderItem.sellerName = item.sellerName;
        orderItem.sellerProductId = item.sellerProductId;
        orderItem.basePriceSnapshot = item.basePriceSnapshot;
        orderItem.salePriceSnapshot = item.salePriceSnapshot;
        orderItem.marginAmountSnapshot = item.marginAmountSnapshot;
        orderItem.commissionType = item.commissionType;
        orderItem.commissionRate = item.commissionRate;
        orderItem.commissionAmount = item.commissionAmount;
        orderItem.attributes = item.attributes;
        orderItem.notes = item.notes;

        if (!dryRun) {
          await queryRunner.manager.save(orderItem);
        }

        this.stats.createdItems++;
      }

      if (!dryRun) {
        await queryRunner.commitTransaction();
      } else {
        await queryRunner.rollbackTransaction();
      }

      console.log(`   ✅ Order ${order.orderNumber}: ${items.length} items ${dryRun ? '(simulated)' : 'created'}`);

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Print summary statistics
   */
  private printSummary(): void {
    const duration = this.stats.endTime
      ? ((this.stats.endTime.getTime() - this.stats.startTime.getTime()) / 1000).toFixed(2)
      : '0';

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                    Backfill Summary                      ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log(`\n📊 Statistics:`);
    console.log(`   Total orders:      ${this.stats.totalOrders}`);
    console.log(`   Processed orders:  ${this.stats.processedOrders}`);
    console.log(`   Total items:       ${this.stats.totalItems}`);
    console.log(`   Created items:     ${this.stats.createdItems}`);
    console.log(`   Skipped items:     ${this.stats.skippedItems} (already exist)`);
    console.log(`   Errors:            ${this.stats.errors}`);
    console.log(`\n⏱️  Duration:          ${duration} seconds`);

    if (this.stats.errors === 0) {
      console.log('\n✅ Backfill completed successfully!');
    } else {
      console.log(`\n⚠️  Backfill completed with ${this.stats.errors} errors`);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse command line arguments
  const options: BackfillOptions = {
    batchSize: 50,
    dryRun: false
  };

  for (const arg of args) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--batch-size=')) {
      options.batchSize = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--help') {
      console.log(`
OrderItem Backfill Script
=========================

Usage:
  npm run backfill:order-items [options]

Options:
  --dry-run           Simulate backfill without writing data
  --batch-size=N      Process N orders per batch (default: 50)
  --help              Show this help message

Examples:
  npm run backfill:order-items --dry-run
  npm run backfill:order-items --batch-size=100
      `);
      process.exit(0);
    }
  }

  const service = new OrderItemBackfillService();

  try {
    await service.backfillAll(options);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { OrderItemBackfillService };
