/**
 * Stock Sync Job (Phase PD-8)
 * Automatically syncs SellerProduct stock when Supplier updates Product inventory
 * Only applies to products with syncPolicy='auto'
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { SellerProduct } from '../entities/SellerProduct.js';
import { Product } from '../entities/Product.js';
import { notificationService } from '../services/NotificationService.js';
import logger from '../utils/logger.js';

export interface StockSyncResult {
  totalChecked: number;
  updated: number;
  lowStockAlerts: number;
  failed: number;
  errors: Array<{ sellerProductId: string; error: string }>;
}

let isRunning = false;
let lastRunTime: Date | null = null;
let lastRunStats: StockSyncResult | null = null;

/**
 * Sync stock for all auto-sync SellerProducts
 */
export async function syncStock(): Promise<StockSyncResult> {
  if (isRunning) {
    logger.warn('[PD-8] Stock sync job is already running, skipping...');
    throw new Error('Stock sync job is already running');
  }

  isRunning = true;
  const startTime = Date.now();

  const result: StockSyncResult = {
    totalChecked: 0,
    updated: 0,
    lowStockAlerts: 0,
    failed: 0,
    errors: []
  };

  try {
    logger.info('[PD-8] Starting stock sync job...');

    const sellerProductRepo = AppDataSource.getRepository(SellerProduct);
    const productRepo = AppDataSource.getRepository(Product);

    // Find all auto-sync seller products
    const sellerProducts = await sellerProductRepo.find({
      where: { syncPolicy: 'auto' },
      relations: ['product']
    });

    result.totalChecked = sellerProducts.length;
    logger.info(`[PD-8] Found ${result.totalChecked} auto-sync products to check for stock`);

    for (const sellerProduct of sellerProducts) {
      try {
        // Get latest supplier product data
        const supplierProduct = await productRepo.findOne({
          where: { id: sellerProduct.productId }
        });

        if (!supplierProduct) {
          logger.warn(`[PD-8] Supplier product not found: ${sellerProduct.productId}`);
          result.failed++;
          result.errors.push({
            sellerProductId: sellerProduct.id,
            error: 'Supplier product not found'
          });
          continue;
        }

        // Check if supplier stock changed
        const currentSupplierStock = supplierProduct.inventory;
        const snapshotStock = sellerProduct.supplierInventorySnapshot;

        if (currentSupplierStock === snapshotStock) {
          // No change, skip
          continue;
        }

        // Stock changed - update SellerProduct
        const oldStock = sellerProduct.supplierInventorySnapshot;
        sellerProduct.supplierInventorySnapshot = currentSupplierStock;

        await sellerProductRepo.save(sellerProduct);
        result.updated++;

        logger.info('[PD-8] Stock synced', {
          sellerProductId: sellerProduct.id,
          sellerId: sellerProduct.sellerId,
          productName: supplierProduct.name,
          oldStock,
          newStock: currentSupplierStock
        });

        // Check if stock dropped below threshold
        const threshold = supplierProduct.lowStockThreshold || 5;
        const wasAboveThreshold = oldStock > threshold;
        const isNowBelowThreshold = currentSupplierStock <= threshold;

        if (wasAboveThreshold && isNowBelowThreshold) {
          // Send low stock notification
          await notificationService.createNotification({
            userId: sellerProduct.sellerId,
            type: 'stock.low',
            title: '재고 부족 알림',
            message: `${supplierProduct.name}의 재고가 ${currentSupplierStock}개로 줄었습니다. (임계값: ${threshold})`,
            metadata: {
              sellerProductId: sellerProduct.id,
              productId: supplierProduct.id,
              productName: supplierProduct.name,
              stock: currentSupplierStock,
              threshold,
              oldStock,
              syncedAt: new Date().toISOString()
            },
            channel: 'in_app'
          }).catch(err => {
            logger.error('[PD-8] Failed to send low stock notification:', err);
          });

          result.lowStockAlerts++;

          logger.info('[PD-8] Low stock alert sent', {
            sellerProductId: sellerProduct.id,
            sellerId: sellerProduct.sellerId,
            productName: supplierProduct.name,
            stock: currentSupplierStock,
            threshold
          });
        }

      } catch (error) {
        result.failed++;
        result.errors.push({
          sellerProductId: sellerProduct.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        logger.error(`[PD-8] Failed to sync stock for ${sellerProduct.id}:`, error);
      }
    }

    const duration = Date.now() - startTime;
    lastRunTime = new Date();
    lastRunStats = result;

    logger.info('[PD-8] Stock sync job completed', {
      duration: `${duration}ms`,
      totalChecked: result.totalChecked,
      updated: result.updated,
      lowStockAlerts: result.lowStockAlerts,
      failed: result.failed
    });

    return result;

  } catch (error) {
    logger.error('[PD-8] Stock sync job failed:', error);
    throw error;
  } finally {
    isRunning = false;
  }
}

/**
 * Check if job is currently running
 */
export function isStockSyncRunning(): boolean {
  return isRunning;
}

/**
 * Get last run statistics
 */
export function getLastRunStats(): {
  lastRunTime: Date | null;
  stats: StockSyncResult | null;
} {
  return {
    lastRunTime,
    stats: lastRunStats
  };
}

/**
 * Trigger stock sync job (manual trigger)
 */
export async function triggerStockSync(): Promise<StockSyncResult> {
  return syncStock();
}
