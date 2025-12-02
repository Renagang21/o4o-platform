/**
 * Commission Calculator Service
 * Phase PD-2: Centralized commission calculation logic
 *
 * Determines commission policy and calculates commission amounts
 * Priority: Product → Seller → Global Default
 */

import AppDataSource from '../database/data-source.js';
import { Product } from '../entities/Product.js';
import { BusinessInfo } from '../entities/BusinessInfo.js';
import { GLOBAL_DEFAULT_COMMISSION_RATE, CommissionType, CommissionPolicy, calculateCommission } from '../config/commission.config.js';
import logger from '../utils/logger.js';

export interface CommissionResult {
  type: 'rate' | 'fixed';
  rate: number; // Effective rate (0-1)
  amount: number; // Commission amount
  source: 'product' | 'seller' | 'global'; // Where the policy came from
}

export class CommissionCalculator {
  private productRepository = AppDataSource.getRepository(Product);
  private businessInfoRepository = AppDataSource.getRepository(BusinessInfo);

  /**
   * Calculate commission for an order item
   * Phase PD-2: Implements Product → Seller → Global fallback logic
   *
   * @param productId - Product UUID
   * @param sellerId - Seller UUID
   * @param itemPrice - Unit price of item
   * @param quantity - Quantity ordered
   * @returns Commission calculation result
   */
  async calculateForItem(
    productId: string,
    sellerId: string,
    itemPrice: number,
    quantity: number
  ): Promise<CommissionResult> {
    // 1. Try to get commission policy from Product
    const product = await this.productRepository.findOne({
      where: { id: productId }
    });

    if (product) {
      const productPolicy = product.getCommissionPolicy();
      if (productPolicy) {
        // Convert product policy to CommissionPolicy type
        const policy: CommissionPolicy = {
          type: productPolicy.type === 'rate' ? CommissionType.RATE : CommissionType.FIXED,
          value: productPolicy.value
        };

        const amount = calculateCommission(
          policy,
          itemPrice,
          quantity
        );

        const effectiveRate = policy.type === CommissionType.RATE
          ? policy.value
          : (policy.value / itemPrice); // Fixed amount to rate

        logger.debug(`[Commission] Product policy applied for ${productId}: ${productPolicy.type} ${productPolicy.value}`, {
          amount,
          source: 'product'
        });

        return {
          type: productPolicy.type,
          rate: effectiveRate,
          amount,
          source: 'product'
        };
      }
    }

    // 2. If no product policy, try Seller's default commission rate
    const businessInfo = await this.businessInfoRepository.findOne({
      where: { userId: sellerId }
    });

    if (businessInfo?.defaultCommissionRate) {
      // Convert percentage (0-100) to rate (0-1)
      const rate = businessInfo.defaultCommissionRate / 100;
      const amount = itemPrice * quantity * rate;

      logger.debug(`[Commission] Seller policy applied for ${sellerId}: ${businessInfo.defaultCommissionRate}%`, {
        amount,
        source: 'seller'
      });

      return {
        type: 'rate',
        rate,
        amount,
        source: 'seller'
      };
    }

    // 3. Fallback to global default (20%)
    const amount = itemPrice * quantity * GLOBAL_DEFAULT_COMMISSION_RATE;

    logger.debug(`[Commission] Global default applied: ${GLOBAL_DEFAULT_COMMISSION_RATE * 100}%`, {
      amount,
      source: 'global'
    });

    return {
      type: 'rate',
      rate: GLOBAL_DEFAULT_COMMISSION_RATE,
      amount,
      source: 'global'
    };
  }

  /**
   * Calculate commissions for multiple items in batch
   * Optimized to reduce database queries
   *
   * @param items - Array of {productId, sellerId, itemPrice, quantity}
   * @returns Map of productId to CommissionResult
   */
  async calculateBatch(
    items: Array<{
      productId: string;
      sellerId: string;
      itemPrice: number;
      quantity: number;
    }>
  ): Promise<Map<string, CommissionResult>> {
    const results = new Map<string, CommissionResult>();

    // Batch fetch all products
    const productIds = items.map(item => item.productId);
    const products = await this.productRepository.findByIds(productIds);
    const productMap = new Map(products.map(p => [p.id, p]));

    // Batch fetch all seller business infos
    const sellerIds = [...new Set(items.map(item => item.sellerId))];
    const businessInfos = await this.businessInfoRepository.find({
      where: sellerIds.map(userId => ({ userId }))
    });
    const sellerMap = new Map(businessInfos.map(b => [b.userId, b]));

    // Calculate for each item
    for (const item of items) {
      const product = productMap.get(item.productId);
      let result: CommissionResult;

      // 1. Check product policy
      if (product) {
        const productPolicy = product.getCommissionPolicy();
        if (productPolicy) {
          // Convert product policy to CommissionPolicy type
          const policy: CommissionPolicy = {
            type: productPolicy.type === 'rate' ? CommissionType.RATE : CommissionType.FIXED,
            value: productPolicy.value
          };

          const amount = calculateCommission(
            policy,
            item.itemPrice,
            item.quantity
          );

          const effectiveRate = policy.type === CommissionType.RATE
            ? policy.value
            : (policy.value / item.itemPrice);

          result = {
            type: productPolicy.type,
            rate: effectiveRate,
            amount,
            source: 'product'
          };
          results.set(item.productId, result);
          continue;
        }
      }

      // 2. Check seller policy
      const businessInfo = sellerMap.get(item.sellerId);
      if (businessInfo?.defaultCommissionRate) {
        const rate = businessInfo.defaultCommissionRate / 100;
        const amount = item.itemPrice * item.quantity * rate;

        result = {
          type: 'rate',
          rate,
          amount,
          source: 'seller'
        };
        results.set(item.productId, result);
        continue;
      }

      // 3. Use global default
      const amount = item.itemPrice * item.quantity * GLOBAL_DEFAULT_COMMISSION_RATE;
      result = {
        type: 'rate',
        rate: GLOBAL_DEFAULT_COMMISSION_RATE,
        amount,
        source: 'global'
      };
      results.set(item.productId, result);
    }

    return results;
  }
}
