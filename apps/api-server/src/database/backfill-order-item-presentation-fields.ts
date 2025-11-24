/**
 * R-8-4: OrderItem Presentation Fields Backfill Script
 *
 * Migrates presentation fields from JSONB Order.items to OrderItem entity columns:
 * - productImage
 * - productBrand
 * - variationName
 *
 * Strategy:
 * - Read JSONB Order.items array
 * - Match each JSONB item to OrderItem entity by:
 *   1. orderId + sellerProductId (preferred)
 *   2. orderId + productId (fallback)
 * - Update OrderItem entity with presentation field values
 * - Skip items already filled (idempotent)
 *
 * Usage:
 *   # Dry run (check without writing):
 *   npm run backfill:order-item-presentation -- --dry-run
 *
 *   # Actual backfill:
 *   npm run backfill:order-item-presentation
 *
 *   # Custom batch size:
 *   npm run backfill:order-item-presentation -- --batch-size=100
 */

import { AppDataSource } from './connection.js';
import { Order } from '../entities/Order.js';
import { OrderItem as OrderItemEntity } from '../entities/OrderItem.js';
import { OrderItem as OrderItemInterface } from '../entities/Order.js';
import logger from '../utils/logger.js';

interface BackfillStats {
  totalOrders: number;
  processedOrders: number;
  totalItemsInOrders: number;
  updatedItems: number;
  skippedItems: number; // Already filled
  unmatchedItems: number; // Could not find matching OrderItem entity
  errors: number;
  startTime: Date;
  endTime?: Date;
}

interface BackfillOptions {
  batchSize: number;
  dryRun: boolean;
}

class OrderItemPresentationFieldsBackfillService {
  private stats: BackfillStats = {
    totalOrders: 0,
    processedOrders: 0,
    totalItemsInOrders: 0,
    updatedItems: 0,
    skippedItems: 0,
    unmatchedItems: 0,
    errors: 0,
    startTime: new Date()
  };

  /**
   * Main backfill execution
   */
  async backfillAll(options: BackfillOptions): Promise<void> {
    logger.info('\n╔═══════════════════════════════════════════════════════════╗');
    logger.info('║   R-8-4: OrderItem Presentation Fields Backfill          ║');
    logger.info('╚═══════════════════════════════════════════════════════════╝\n');

    if (options.dryRun) {
      logger.info('🔍 DRY RUN MODE - No data will be written\n');
    }

    try {
      // Initialize database
      if (!AppDataSource.isInitialized) {
        logger.info('📡 Initializing database connection...');
        await AppDataSource.initialize();
      }

      const orderRepo = AppDataSource.getRepository(Order);
      const orderItemRepo = AppDataSource.getRepository(OrderItemEntity);

      // Count total orders
      this.stats.totalOrders = await orderRepo.count();
      logger.info(`📊 Total orders in database: ${this.stats.totalOrders}\n`);

      if (this.stats.totalOrders === 0) {
        logger.info('✅ No orders found. Nothing to backfill.');
        return;
      }

      // Process in batches
      const batchSize = options.batchSize;
      const totalBatches = Math.ceil(this.stats.totalOrders / batchSize);
      let currentBatch = 0;

      for (let offset = 0; offset < this.stats.totalOrders; offset += batchSize) {
        currentBatch++;
        logger.info(`\n📦 Processing batch ${currentBatch}/${totalBatches} (offset: ${offset}, size: ${batchSize})`);

        // Fetch batch of orders
        const orders = await orderRepo.find({
          skip: offset,
          take: batchSize,
          order: { createdAt: 'ASC' }
        });

        // Process each order
        for (const order of orders) {
          try {
            await this.backfillOrderPresentationFields(order, orderItemRepo, options.dryRun);
            this.stats.processedOrders++;
          } catch (error: any) {
            logger.error(`❌ Error processing order ${order.orderNumber}:`, error.message);
            this.stats.errors++;
          }
        }

        // Progress update
        const progress = ((offset + batchSize) / this.stats.totalOrders * 100).toFixed(1);
        logger.info(`   Progress: ${progress}% (${this.stats.processedOrders}/${this.stats.totalOrders} orders)`);
      }

      this.stats.endTime = new Date();
      this.printSummary();

    } catch (error: any) {
      logger.error('\n❌ Backfill failed:', error.message);
      logger.error(error.stack);
      throw error;
    }
  }

  /**
   * Backfill presentation fields for a single order
   */
  private async backfillOrderPresentationFields(
    order: Order,
    orderItemRepo: any,
    dryRun: boolean
  ): Promise<void> {
    const jsonbItems: OrderItemInterface[] = order.items || [];

    if (jsonbItems.length === 0) {
      return;
    }

    this.stats.totalItemsInOrders += jsonbItems.length;

    // Process each JSONB item
    for (const jsonbItem of jsonbItems) {
      try {
        // Strategy 1: Match by orderId + sellerProductId (preferred)
        let orderItemEntity: OrderItemEntity | null = null;

        if (jsonbItem.sellerProductId) {
          orderItemEntity = await orderItemRepo.findOne({
            where: {
              orderId: order.id,
              sellerProductId: jsonbItem.sellerProductId
            }
          });
        }

        // Strategy 2: Fallback to orderId + productId
        if (!orderItemEntity && jsonbItem.productId) {
          orderItemEntity = await orderItemRepo.findOne({
            where: {
              orderId: order.id,
              productId: jsonbItem.productId
            }
          });
        }

        // No matching OrderItem entity found
        if (!orderItemEntity) {
          this.stats.unmatchedItems++;
          logger.info(`   ⚠️  No OrderItem entity found for JSONB item ${jsonbItem.productId} in order ${order.orderNumber}`);
          continue;
        }

        // Check if already filled (idempotent)
        const isAlreadyFilled =
          orderItemEntity.productImage !== null ||
          orderItemEntity.productBrand !== null ||
          orderItemEntity.variationName !== null;

        if (isAlreadyFilled) {
          this.stats.skippedItems++;
          continue;
        }

        // Extract presentation fields from JSONB
        const hasAnyField =
          jsonbItem.productImage ||
          jsonbItem.productBrand ||
          jsonbItem.variationName;

        if (!hasAnyField) {
          // JSONB item doesn't have any presentation fields either
          this.stats.skippedItems++;
          continue;
        }

        // Update entity
        orderItemEntity.productImage = jsonbItem.productImage || null;
        orderItemEntity.productBrand = jsonbItem.productBrand || null;
        orderItemEntity.variationName = jsonbItem.variationName || null;

        if (!dryRun) {
          await orderItemRepo.save(orderItemEntity);
        }

        this.stats.updatedItems++;

      } catch (error: any) {
        logger.error(`   ❌ Error processing item ${jsonbItem.productId}:`, error.message);
        this.stats.errors++;
      }
    }

    if (!dryRun) {
      logger.info(`   ✅ Order ${order.orderNumber}: ${this.stats.updatedItems} items ${dryRun ? '(simulated)' : 'updated'}`);
    }
  }

  /**
   * Print summary statistics
   */
  private printSummary(): void {
    const duration = this.stats.endTime
      ? ((this.stats.endTime.getTime() - this.stats.startTime.getTime()) / 1000).toFixed(2)
      : '0';

    logger.info('\n╔═══════════════════════════════════════════════════════════╗');
    logger.info('║              Presentation Fields Backfill Summary         ║');
    logger.info('╚═══════════════════════════════════════════════════════════╝');
    logger.info(`\n📊 Statistics:`);
    logger.info(`   Total orders:           ${this.stats.totalOrders}`);
    logger.info(`   Processed orders:       ${this.stats.processedOrders}`);
    logger.info(`   Total items in orders:  ${this.stats.totalItemsInOrders}`);
    logger.info(`   Updated items:          ${this.stats.updatedItems}`);
    logger.info(`   Skipped items:          ${this.stats.skippedItems} (already filled or no data)`);
    logger.info(`   Unmatched items:        ${this.stats.unmatchedItems} (no OrderItem entity)`);
    logger.info(`   Errors:                 ${this.stats.errors}`);
    logger.info(`\n⏱️  Duration:               ${duration} seconds`);

    if (this.stats.errors === 0) {
      logger.info('\n✅ Backfill completed successfully!');
    } else {
      logger.info(`\n⚠️  Backfill completed with ${this.stats.errors} errors`);
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
      logger.info(`
OrderItem Presentation Fields Backfill Script
==============================================

Usage:
  npm run backfill:order-item-presentation [options]

Options:
  --dry-run           Simulate backfill without writing data
  --batch-size=N      Process N orders per batch (default: 50)
  --help              Show this help message

Examples:
  npm run backfill:order-item-presentation --dry-run
  npm run backfill:order-item-presentation --batch-size=100
      `);
      process.exit(0);
    }
  }

  const service = new OrderItemPresentationFieldsBackfillService();

  try {
    await service.backfillAll(options);
    process.exit(0);
  } catch (error) {
    logger.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { OrderItemPresentationFieldsBackfillService };
