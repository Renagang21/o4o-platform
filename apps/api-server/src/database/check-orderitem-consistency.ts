/**
 * R-8-5: OrderItem Presentation Fields Consistency Checker
 *
 * Validates that presentation fields are consistent between:
 * - JSONB Order.items (legacy)
 * - OrderItem entities (relational)
 *
 * This helps identify data quality issues before R-8-6 (JSONB removal).
 *
 * Usage:
 *   # Check recent orders (default: last 30 days)
 *   npm run check:orderitem-consistency
 *
 *   # Check specific date range
 *   npm run check:orderitem-consistency -- --days=7
 *
 *   # Check all orders (warning: slow for large datasets)
 *   npm run check:orderitem-consistency -- --all
 *
 *   # Verbose mode (show all mismatches)
 *   npm run check:orderitem-consistency -- --verbose
 */

import { AppDataSource } from './connection.js';
import { Order } from '../entities/Order.js';
import { OrderItem as OrderItemEntity } from '../entities/OrderItem.js';
import { OrderItem as OrderItemInterface } from '../entities/Order.js';
import logger from '../utils/logger.js';

interface FieldMismatch {
  orderId: string;
  orderNumber: string;
  itemIndex: number;
  productId: string;
  fieldName: string;
  jsonbValue: any;
  entityValue: any;
}

interface ConsistencyStats {
  totalOrders: number;
  ordersChecked: number;
  totalItems: number;
  itemsWithMismatches: number;
  mismatches: FieldMismatch[];
  fieldMismatchCounts: Record<string, number>;
  ordersWithoutEntities: number;
  entitiesWithoutJsonb: number;
  startTime: Date;
  endTime?: Date;
}

interface CheckOptions {
  days?: number;
  all?: boolean;
  verbose?: boolean;
}

class OrderItemConsistencyChecker {
  private stats: ConsistencyStats = {
    totalOrders: 0,
    ordersChecked: 0,
    totalItems: 0,
    itemsWithMismatches: 0,
    mismatches: [],
    fieldMismatchCounts: {},
    ordersWithoutEntities: 0,
    entitiesWithoutJsonb: 0,
    startTime: new Date()
  };

  /**
   * Main check execution
   */
  async checkAll(options: CheckOptions): Promise<void> {
    logger.info('\n╔═══════════════════════════════════════════════════════════╗');
    logger.info('║   R-8-5: OrderItem Consistency Check                     ║');
    logger.info('╚═══════════════════════════════════════════════════════════╝\n');

    try {
      // Initialize database
      if (!AppDataSource.isInitialized) {
        logger.info('📡 Initializing database connection...');
        await AppDataSource.initialize();
      }

      const orderRepo = AppDataSource.getRepository(Order);
      const orderItemRepo = AppDataSource.getRepository(OrderItemEntity);

      // Build query
      const query = orderRepo.createQueryBuilder('order');

      if (!options.all) {
        const days = options.days || 30;
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - days);

        query.where('order.createdAt >= :dateFrom', { dateFrom });
        logger.info(`📅 Checking orders from last ${days} days\n`);
      } else {
        logger.info('📅 Checking ALL orders (this may take a while)\n');
      }

      query.orderBy('order.createdAt', 'DESC');

      // Get orders
      const orders = await query.getMany();
      this.stats.totalOrders = orders.length;

      if (this.stats.totalOrders === 0) {
        logger.info('✅ No orders found in the specified range.');
        return;
      }

      logger.info(`📊 Total orders to check: ${this.stats.totalOrders}\n`);

      // Check each order
      for (const order of orders) {
        await this.checkOrder(order, orderItemRepo, options.verbose || false);
        this.stats.ordersChecked++;

        // Progress indicator (every 10 orders)
        if (this.stats.ordersChecked % 10 === 0) {
          logger.info(`   Progress: ${this.stats.ordersChecked}/${this.stats.totalOrders} orders checked...`);
        }
      }

      this.stats.endTime = new Date();
      this.printSummary(options.verbose || false);

    } catch (error: any) {
      logger.error('\n❌ Consistency check failed:', error.message);
      logger.error(error.stack);
      throw error;
    }
  }

  /**
   * Check a single order for consistency
   */
  private async checkOrder(
    order: Order,
    orderItemRepo: any,
    verbose: boolean
  ): Promise<void> {
    const jsonbItems: OrderItemInterface[] = order.items || [];

    if (jsonbItems.length === 0) {
      // Order has no JSONB items (unusual but not an error)
      return;
    }

    this.stats.totalItems += jsonbItems.length;

    // Get OrderItem entities for this order
    const orderItemEntities = await orderItemRepo.find({
      where: { orderId: order.id }
    });

    if (orderItemEntities.length === 0) {
      // No entities found - this is expected for old orders before R-8-3-1
      this.stats.ordersWithoutEntities++;
      return;
    }

    // Check each JSONB item
    for (let i = 0; i < jsonbItems.length; i++) {
      const jsonbItem = jsonbItems[i];

      // Find matching entity (by productId or sellerProductId)
      let matchingEntity = orderItemEntities.find(
        e => e.sellerProductId && e.sellerProductId === jsonbItem.sellerProductId
      );

      if (!matchingEntity) {
        matchingEntity = orderItemEntities.find(
          e => e.productId === jsonbItem.productId
        );
      }

      if (!matchingEntity) {
        // No matching entity found for this JSONB item
        if (verbose) {
          logger.warn(`   ⚠️  Order ${order.orderNumber}: No entity found for JSONB item ${jsonbItem.productId}`);
        }
        continue;
      }

      // Compare presentation fields
      const mismatches = this.compareFields(
        order,
        i,
        jsonbItem,
        matchingEntity
      );

      if (mismatches.length > 0) {
        this.stats.itemsWithMismatches++;
        this.stats.mismatches.push(...mismatches);

        if (verbose) {
          logger.warn(`   ❌ Order ${order.orderNumber}, Item ${i}: ${mismatches.length} field mismatch(es)`);
          for (const mismatch of mismatches) {
            logger.warn(`      - ${mismatch.fieldName}: JSONB="${mismatch.jsonbValue}" vs Entity="${mismatch.entityValue}"`);
          }
        }
      }
    }
  }

  /**
   * Compare presentation fields between JSONB and entity
   */
  private compareFields(
    order: Order,
    itemIndex: number,
    jsonbItem: OrderItemInterface,
    entity: OrderItemEntity
  ): FieldMismatch[] {
    const mismatches: FieldMismatch[] = [];
    const fieldsToCheck: (keyof OrderItemInterface)[] = [
      'productImage',
      'productBrand',
      'variationName',
      'productSku',
      'productName'
    ];

    for (const fieldName of fieldsToCheck) {
      const jsonbValue = jsonbItem[fieldName];
      const entityValue = entity[fieldName];

      // Normalize values for comparison
      const normalizedJsonb = this.normalizeValue(jsonbValue);
      const normalizedEntity = this.normalizeValue(entityValue);

      if (normalizedJsonb !== normalizedEntity) {
        const mismatch: FieldMismatch = {
          orderId: order.id,
          orderNumber: order.orderNumber,
          itemIndex,
          productId: jsonbItem.productId,
          fieldName,
          jsonbValue: normalizedJsonb,
          entityValue: normalizedEntity
        };

        mismatches.push(mismatch);

        // Track field mismatch counts
        if (!this.stats.fieldMismatchCounts[fieldName]) {
          this.stats.fieldMismatchCounts[fieldName] = 0;
        }
        this.stats.fieldMismatchCounts[fieldName]++;
      }
    }

    return mismatches;
  }

  /**
   * Normalize value for comparison
   * - null, undefined, '' are all treated as empty
   */
  private normalizeValue(value: any): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    return String(value);
  }

  /**
   * Print summary statistics
   */
  private printSummary(verbose: boolean): void {
    const duration = this.stats.endTime
      ? ((this.stats.endTime.getTime() - this.stats.startTime.getTime()) / 1000).toFixed(2)
      : '0';

    logger.info('\n╔═══════════════════════════════════════════════════════════╗');
    logger.info('║              Consistency Check Summary                    ║');
    logger.info('╚═══════════════════════════════════════════════════════════╝');
    logger.info(`\n📊 Statistics:`);
    logger.info(`   Total orders:              ${this.stats.totalOrders}`);
    logger.info(`   Orders checked:            ${this.stats.ordersChecked}`);
    logger.info(`   Total items:               ${this.stats.totalItems}`);
    logger.info(`   Items with mismatches:     ${this.stats.itemsWithMismatches}`);
    logger.info(`   Orders without entities:   ${this.stats.ordersWithoutEntities} (old orders, expected)`);
    logger.info(`\n📋 Field Mismatch Breakdown:`);

    if (Object.keys(this.stats.fieldMismatchCounts).length === 0) {
      logger.info('   ✅ No field mismatches found!');
    } else {
      for (const [field, count] of Object.entries(this.stats.fieldMismatchCounts)) {
        logger.info(`   - ${field}: ${count}`);
      }
    }

    logger.info(`\n⏱️  Duration:                 ${duration} seconds`);

    // Show sample mismatches if not in verbose mode
    if (!verbose && this.stats.mismatches.length > 0) {
      logger.info(`\n🔍 Sample Mismatches (first 5):`);
      const sampleMismatches = this.stats.mismatches.slice(0, 5);

      for (const mismatch of sampleMismatches) {
        logger.info(`   Order ${mismatch.orderNumber}, Item ${mismatch.itemIndex}:`);
        logger.info(`   - Field: ${mismatch.fieldName}`);
        logger.info(`   - JSONB: "${mismatch.jsonbValue}"`);
        logger.info(`   - Entity: "${mismatch.entityValue}"`);
        logger.info('');
      }

      if (this.stats.mismatches.length > 5) {
        logger.info(`   ... and ${this.stats.mismatches.length - 5} more. Use --verbose to see all.`);
      }
    }

    // Overall status
    if (this.stats.itemsWithMismatches === 0) {
      logger.info('\n✅ Consistency check passed! All presentation fields match.');
    } else {
      const mismatchRate = (this.stats.itemsWithMismatches / this.stats.totalItems * 100).toFixed(2);
      logger.info(`\n⚠️  Consistency issues found:`);
      logger.info(`   ${this.stats.itemsWithMismatches} items (${mismatchRate}%) have field mismatches`);
      logger.info(`\n💡 Recommendation:`);
      logger.info(`   1. Review the mismatches above`);
      logger.info(`   2. Re-run backfill script if needed: npm run backfill:order-item-presentation`);
      logger.info(`   3. Investigate root cause for new orders`);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse command line arguments
  const options: CheckOptions = {
    days: 30,
    all: false,
    verbose: false
  };

  for (const arg of args) {
    if (arg === '--all') {
      options.all = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg.startsWith('--days=')) {
      options.days = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--help') {
      logger.info(`
OrderItem Presentation Fields Consistency Checker
==================================================

Usage:
  npm run check:orderitem-consistency [options]

Options:
  --days=N      Check orders from last N days (default: 30)
  --all         Check all orders (warning: slow for large datasets)
  --verbose     Show all mismatches in detail
  --help        Show this help message

Examples:
  npm run check:orderitem-consistency
  npm run check:orderitem-consistency -- --days=7
  npm run check:orderitem-consistency -- --all --verbose
      `);
      process.exit(0);
    }
  }

  const checker = new OrderItemConsistencyChecker();

  try {
    await checker.checkAll(options);
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

export { OrderItemConsistencyChecker };
