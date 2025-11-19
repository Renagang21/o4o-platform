/**
 * Price Sync Job (Phase PD-8)
 * Automatically syncs SellerProduct prices when Supplier updates Product prices
 * Only applies to products with syncPolicy='auto'
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { SellerProduct } from '../entities/SellerProduct.js';
import { Product } from '../entities/Product.js';
import { notificationService } from '../services/NotificationService.js';
import logger from '../utils/logger.js';

export interface PriceSyncResult {
  totalChecked: number;
  updated: number;
  failed: number;
  errors: Array<{ sellerProductId: string; error: string }>;
}

let isRunning = false;
let lastRunTime: Date | null = null;
let lastRunStats: PriceSyncResult | null = null;

/**
 * Sync prices for all auto-sync SellerProducts
 */
export async function syncPrices(): Promise<PriceSyncResult> {
  if (isRunning) {
    logger.warn('[PD-8] Price sync job is already running, skipping...');
    throw new Error('Price sync job is already running');
  }

  isRunning = true;
  const startTime = Date.now();

  const result: PriceSyncResult = {
    totalChecked: 0,
    updated: 0,
    failed: 0,
    errors: []
  };

  try {
    logger.info('[PD-8] Starting price sync job...');

    const sellerProductRepo = AppDataSource.getRepository(SellerProduct);
    const productRepo = AppDataSource.getRepository(Product);

    // Find all auto-sync seller products
    const sellerProducts = await sellerProductRepo.find({
      where: { syncPolicy: 'auto' },
      relations: ['product']
    });

    result.totalChecked = sellerProducts.length;
    logger.info(`[PD-8] Found ${result.totalChecked} auto-sync products to check`);

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

        // Check if supplier price changed
        const currentSupplierPrice = supplierProduct.supplierPrice;
        const snapshotPrice = sellerProduct.basePriceSnapshot;

        if (currentSupplierPrice === snapshotPrice) {
          // No change, skip
          continue;
        }

        // Price changed - update SellerProduct
        const oldSalePrice = sellerProduct.salePrice;
        const oldBasePrice = sellerProduct.basePriceSnapshot;

        // Recalculate using margin rate
        if (sellerProduct.marginRate) {
          sellerProduct.basePriceSnapshot = currentSupplierPrice;
          sellerProduct.salePrice = Math.round(currentSupplierPrice * (1 + sellerProduct.marginRate / 100));
        } else {
          // If no margin rate, maintain the same margin amount
          const currentMargin = oldSalePrice - oldBasePrice;
          sellerProduct.basePriceSnapshot = currentSupplierPrice;
          sellerProduct.salePrice = currentSupplierPrice + currentMargin;
        }

        await sellerProductRepo.save(sellerProduct);
        result.updated++;

        logger.info('[PD-8] Price synced', {
          sellerProductId: sellerProduct.id,
          sellerId: sellerProduct.sellerId,
          productName: supplierProduct.name,
          oldSupplierPrice: oldBasePrice,
          newSupplierPrice: currentSupplierPrice,
          oldSalePrice,
          newSalePrice: sellerProduct.salePrice
        });

        // Send notification to seller
        const priceDiff = currentSupplierPrice - oldBasePrice;
        const priceChange = priceDiff > 0 ? '인상' : '인하';
        const priceChangePercent = Math.abs((priceDiff / oldBasePrice) * 100).toFixed(1);

        await notificationService.createNotification({
          userId: sellerProduct.sellerId,
          type: 'price.changed',
          title: '공급 가격이 자동 동기화되었습니다',
          message: `${supplierProduct.name} - ${priceChange} ${priceChangePercent}% (판매가: ${oldSalePrice.toLocaleString()}원 → ${sellerProduct.salePrice.toLocaleString()}원)`,
          metadata: {
            sellerProductId: sellerProduct.id,
            productId: supplierProduct.id,
            productName: supplierProduct.name,
            oldSupplierPrice: oldBasePrice,
            newSupplierPrice: currentSupplierPrice,
            oldSalePrice,
            newSalePrice: sellerProduct.salePrice,
            priceDiff,
            priceChangePercent: parseFloat(priceChangePercent)
          },
          channel: 'in_app'
        }).catch(err => {
          logger.error('[PD-8] Failed to send price sync notification:', err);
        });

      } catch (error) {
        result.failed++;
        result.errors.push({
          sellerProductId: sellerProduct.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        logger.error(`[PD-8] Failed to sync price for ${sellerProduct.id}:`, error);
      }
    }

    const duration = Date.now() - startTime;
    lastRunTime = new Date();
    lastRunStats = result;

    logger.info('[PD-8] Price sync job completed', {
      duration: `${duration}ms`,
      totalChecked: result.totalChecked,
      updated: result.updated,
      failed: result.failed
    });

    return result;

  } catch (error) {
    logger.error('[PD-8] Price sync job failed:', error);
    throw error;
  } finally {
    isRunning = false;
  }
}

/**
 * Check if job is currently running
 */
export function isPriceSyncRunning(): boolean {
  return isRunning;
}

/**
 * Get last run statistics
 */
export function getLastRunStats(): {
  lastRunTime: Date | null;
  stats: PriceSyncResult | null;
} {
  return {
    lastRunTime,
    stats: lastRunStats
  };
}

/**
 * Trigger price sync job (manual trigger)
 */
export async function triggerPriceSync(): Promise<PriceSyncResult> {
  return syncPrices();
}
