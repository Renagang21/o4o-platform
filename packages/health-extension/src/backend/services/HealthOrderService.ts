/**
 * Health Order Service
 *
 * Health 제품 주문 관리
 * - 일반 Seller 주문 가능 (PHARMACEUTICAL과 다름)
 * - SellerType 제한 없음
 *
 * @package @o4o/health-extension
 */

import { DataSource, Repository } from 'typeorm';
import {
  type HealthMetadata,
  isHealthProduct,
} from '../../types.js';
import { healthValidationHooks } from '../hooks/health-validation.hook.js';

// Core entity type references
interface Order {
  id: string;
  offerId: string;
  buyerId: string;
  sellerId: string;
  quantity: number;
  totalAmount: number;
  status: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

interface Offer {
  id: string;
  productId: string;
  sellerId: string;
  price: number;
  status: string;
}

interface Product {
  id: string;
  name: string;
  productType?: string;
  metadata?: Record<string, any>;
}

export interface HealthOrderDetail {
  id: string;
  offerId: string;
  productId: string;
  productName: string;
  buyerId: string;
  sellerId: string;
  quantity: number;
  totalAmount: number;
  status: string;
  healthInfo: {
    functionDescription: string;
    intakeMethod: string;
    caution: string;
    expirationDate: string;
  };
  createdAt?: string;
}

export interface CreateHealthOrderDto {
  offerId: string;
  buyerId: string;
  quantity: number;
  metadata?: Record<string, any>;
}

export class HealthOrderService {
  private orderRepo: Repository<Order>;
  private offerRepo: Repository<Offer>;
  private productRepo: Repository<Product>;

  constructor(private dataSource: DataSource) {
    this.orderRepo = dataSource.getRepository('Order') as Repository<Order>;
    this.offerRepo = dataSource.getRepository('Offer') as Repository<Offer>;
    this.productRepo = dataSource.getRepository('Product') as Repository<Product>;
  }

  /**
   * Create order for health product
   * Health products have no SellerType restriction (unlike PHARMACEUTICAL)
   */
  async createOrder(
    dto: CreateHealthOrderDto,
    user: { id: string; role: string; sellerId?: string },
  ): Promise<{ success: boolean; order?: HealthOrderDetail; errors?: string[]; warnings?: string[] }> {
    try {
      // Fetch offer
      const offer = await this.offerRepo.findOne({
        where: { id: dto.offerId },
      });

      if (!offer) {
        return { success: false, errors: ['Offer를 찾을 수 없습니다'] };
      }

      if (offer.status !== 'active') {
        return { success: false, errors: ['활성화된 Offer가 아닙니다'] };
      }

      // Fetch product
      const product = await this.productRepo.findOne({
        where: { id: offer.productId },
      });

      if (!product || !isHealthProduct(product)) {
        return { success: false, errors: ['Health 제품이 아닙니다'] };
      }

      // Run before hook
      const hookResult = await healthValidationHooks.beforeOrderCreate({
        data: {
          offer,
          order: dto,
        },
        user,
      });

      if (!hookResult.success) {
        return {
          success: false,
          errors: hookResult.errors,
          warnings: hookResult.warnings,
        };
      }

      // Calculate total
      const totalAmount = offer.price * dto.quantity;

      // Create order
      const order = this.orderRepo.create({
        offerId: dto.offerId,
        buyerId: dto.buyerId,
        sellerId: offer.sellerId,
        quantity: dto.quantity,
        totalAmount,
        status: 'pending',
        metadata: {
          ...dto.metadata,
          productType: 'HEALTH',
          healthValidated: true,
        },
      });

      const savedOrder = await this.orderRepo.save(order);

      // Run after hook
      await healthValidationHooks.afterOrderCreate({
        data: {
          offer,
          order: savedOrder,
        },
        user,
      });

      const detail = await this.getOrderDetail(savedOrder.id);

      return {
        success: true,
        order: detail || undefined,
        warnings: hookResult.warnings,
      };
    } catch (error) {
      console.error('[HealthOrder] Error creating order:', error);
      throw error;
    }
  }

  /**
   * Get order list for health products
   */
  async getOrderList(
    filters: {
      buyerId?: string;
      sellerId?: string;
      status?: string;
    },
    pagination: { page: number; limit: number },
  ): Promise<{ items: HealthOrderDetail[]; total: number }> {
    try {
      const qb = this.orderRepo
        .createQueryBuilder('order')
        .where(`order.metadata->>'productType' = :type`, { type: 'HEALTH' });

      if (filters.buyerId) {
        qb.andWhere('order.buyerId = :buyerId', { buyerId: filters.buyerId });
      }

      if (filters.sellerId) {
        qb.andWhere('order.sellerId = :sellerId', { sellerId: filters.sellerId });
      }

      if (filters.status) {
        qb.andWhere('order.status = :status', { status: filters.status });
      }

      const total = await qb.getCount();
      const orders = await qb
        .skip((pagination.page - 1) * pagination.limit)
        .take(pagination.limit)
        .orderBy('order.createdAt', 'DESC')
        .getMany();

      const items: HealthOrderDetail[] = [];
      for (const order of orders) {
        const detail = await this.getOrderDetail(order.id);
        if (detail) {
          items.push(detail);
        }
      }

      return { items, total };
    } catch (error) {
      console.error('[HealthOrder] Error fetching order list:', error);
      throw error;
    }
  }

  /**
   * Get order detail
   */
  async getOrderDetail(orderId: string): Promise<HealthOrderDetail | null> {
    try {
      const order = await this.orderRepo.findOne({
        where: { id: orderId },
      });

      if (!order) {
        return null;
      }

      const offer = await this.offerRepo.findOne({
        where: { id: order.offerId },
      });

      if (!offer) {
        return null;
      }

      const product = await this.productRepo.findOne({
        where: { id: offer.productId },
      });

      if (!product || !isHealthProduct(product)) {
        return null;
      }

      const metadata = product.metadata as HealthMetadata;

      return {
        id: order.id,
        offerId: order.offerId,
        productId: offer.productId,
        productName: product.name,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        quantity: order.quantity,
        totalAmount: order.totalAmount,
        status: order.status,
        healthInfo: {
          functionDescription: metadata.functionDescription || '',
          intakeMethod: metadata.intakeMethod || '',
          caution: metadata.caution || '',
          expirationDate: metadata.expirationDate
            ? new Date(metadata.expirationDate).toISOString()
            : '',
        },
        createdAt: order.createdAt?.toISOString(),
      };
    } catch (error) {
      console.error('[HealthOrder] Error fetching order detail:', error);
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    status: string,
    user: { id: string; role: string },
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const order = await this.orderRepo.findOne({
        where: { id: orderId },
      });

      if (!order) {
        return { success: false, errors: ['주문을 찾을 수 없습니다'] };
      }

      await this.orderRepo.update(orderId, { status });

      console.log(`[health-extension] Health Order ${orderId} status updated to ${status}`);

      return { success: true };
    } catch (error) {
      console.error('[HealthOrder] Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Get seller order summary
   */
  async getSellerOrderSummary(sellerId: string): Promise<{
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalRevenue: number;
  }> {
    try {
      const qb = this.orderRepo
        .createQueryBuilder('order')
        .where('order.sellerId = :sellerId', { sellerId })
        .andWhere(`order.metadata->>'productType' = :type`, { type: 'HEALTH' });

      const orders = await qb.getMany();

      const summary = {
        totalOrders: orders.length,
        pendingOrders: orders.filter((o) => o.status === 'pending').length,
        completedOrders: orders.filter((o) => o.status === 'completed').length,
        totalRevenue: orders
          .filter((o) => o.status === 'completed')
          .reduce((sum, o) => sum + o.totalAmount, 0),
      };

      return summary;
    } catch (error) {
      console.error('[HealthOrder] Error fetching seller order summary:', error);
      throw error;
    }
  }
}

export default HealthOrderService;
