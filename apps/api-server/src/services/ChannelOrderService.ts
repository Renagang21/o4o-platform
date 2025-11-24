/**
 * Channel Order Service
 * Phase PD-9: Multichannel RPA 1차
 *
 * Handles order imports from external channels
 */

import AppDataSource from '../database/data-source.js';
import { ChannelOrderLink, ChannelOrderStatus } from '../entities/ChannelOrderLink.js';
import { Order, type OrderItem } from '../entities/Order.js';
import { OrderItem as OrderItemEntity } from '../entities/OrderItem.js';
import { channelConnectorRegistry } from '../channels/index.js';
import { channelManagementService } from './ChannelManagementService.js';
import type { ExternalOrder } from '../channels/IChannelConnector.js';
import { OrderService } from './OrderService.js';

export interface ImportOrdersDto {
  sellerId: string;
  channelAccountId: string;
  since?: Date;
  limit?: number;
}

export interface ImportOrdersResult {
  imported: number;
  skipped: number;
  failed: number;
  details: Array<{
    externalOrderId: string;
    status: 'imported' | 'skipped' | 'failed';
    orderId?: string;
    linkId?: string;
    reason?: string;
  }>;
}

export class ChannelOrderService {
  private linkRepository = AppDataSource.getRepository(ChannelOrderLink);
  private orderRepository = AppDataSource.getRepository(Order);
  private orderItemRepository = AppDataSource.getRepository(OrderItemEntity);
  private orderService = new OrderService();

  /**
   * Import orders from channel
   */
  async importOrders(data: ImportOrdersDto): Promise<ImportOrdersResult> {
    const { sellerId, channelAccountId, since, limit = 50 } = data;

    // Get channel account
    const account = await channelManagementService.getChannelAccountById(channelAccountId, sellerId);

    // Get connector
    const connector = channelConnectorRegistry.getConnector(account.channelCode);

    // Call connector to fetch orders
    const importResult = await connector.importOrders({
      account,
      since,
      limit,
    });

    const result: ImportOrdersResult = {
      imported: 0,
      skipped: 0,
      failed: 0,
      details: [],
    };

    // Process each order
    for (const externalOrder of importResult.orders) {
      try {
        // Check if order already imported
        const existingLink = await this.linkRepository.findOne({
          where: {
            channelAccountId,
            externalOrderId: externalOrder.externalOrderId,
          },
        });

        if (existingLink) {
          result.skipped++;
          result.details.push({
            externalOrderId: externalOrder.externalOrderId,
            status: 'skipped',
            orderId: existingLink.internalOrderId || undefined,
            linkId: existingLink.id,
            reason: 'Already imported',
          });
          continue;
        }

        // Create internal order
        const internalOrder = await this.createInternalOrder(sellerId, externalOrder);

        // Create order link
        const link = this.linkRepository.create({
          channelAccountId,
          externalOrderId: externalOrder.externalOrderId,
          internalOrderId: internalOrder.id,
          status: ChannelOrderStatus.IMPORTED,
          externalOrderData: externalOrder,
          externalOrderDate: externalOrder.externalOrderDate,
          lastSyncAt: new Date(),
        });

        await this.linkRepository.save(link);

        result.imported++;
        result.details.push({
          externalOrderId: externalOrder.externalOrderId,
          status: 'imported',
          orderId: internalOrder.id,
          linkId: link.id,
        });
      } catch (error) {
        result.failed++;
        result.details.push({
          externalOrderId: externalOrder.externalOrderId,
          status: 'failed',
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  /**
   * Create internal order from external order data
   *
   * R-8-6: Use OrderService to create order with OrderItem entities
   */
  private async createInternalOrder(sellerId: string, externalOrder: ExternalOrder): Promise<Order> {
    // Map external items to OrderItem interface format
    const orderItems: OrderItem[] = externalOrder.items.map(item => ({
      id: crypto.randomUUID(),
      productId: '', // No product mapping yet
      productName: item.productName,
      productSku: item.externalProductId,
      productImage: '',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      supplierId: sellerId, // Temp: use seller as supplier
      supplierName: '',
      sellerId: sellerId,
      sellerName: '',
      attributes: item.options,
    }));

    // R-8-6: Use OrderService.createOrder() which handles OrderItem entity creation
    const order = await this.orderService.createOrder(sellerId, {
      items: orderItems,
      billingAddress: externalOrder.shippingAddress,
      shippingAddress: externalOrder.shippingAddress,
      paymentMethod: this.mapPaymentMethod(externalOrder.paymentMethod),
      notes: `Imported from channel: ${externalOrder.externalOrderId}`,
    });

    return order;
  }

  /**
   * Generate unique order number
   */
  private generateOrderNumber(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.getTime().toString().slice(-6);
    return `ORD${dateStr}${timeStr}`;
  }

  /**
   * Map external payment status to internal status
   */
  private mapPaymentStatus(externalStatus: string): any {
    const statusMap: Record<string, string> = {
      'completed': 'COMPLETED',
      'pending': 'PENDING',
      'failed': 'FAILED',
      'refunded': 'REFUNDED',
      'cancelled': 'PENDING',
    };

    return statusMap[externalStatus] || 'PENDING';
  }

  /**
   * Map external payment method to internal method
   */
  private mapPaymentMethod(externalMethod: string): any {
    const methodMap: Record<string, string> = {
      'card': 'CARD',
      'transfer': 'TRANSFER',
      'kakao_pay': 'KAKAO_PAY',
      'naver_pay': 'NAVER_PAY',
    };

    return methodMap[externalMethod] || 'CARD';
  }

  /**
   * Get order links for a channel account
   */
  async getOrderLinks(sellerId: string, channelAccountId: string): Promise<ChannelOrderLink[]> {
    // Verify account ownership
    await channelManagementService.getChannelAccountById(channelAccountId, sellerId);

    return this.linkRepository.find({
      where: { channelAccountId },
      relations: ['internalOrder'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get order link by ID
   */
  async getOrderLinkById(id: string, sellerId: string): Promise<ChannelOrderLink> {
    const link = await this.linkRepository.findOne({
      where: { id },
      relations: ['internalOrder', 'channelAccount'],
    });

    if (!link) {
      throw new Error(`Order link not found: ${id}`);
    }

    // Verify ownership through channel account
    if (link.channelAccount && link.channelAccount.sellerId !== sellerId) {
      throw new Error('Unauthorized access to order link');
    }

    return link;
  }

  /**
   * Retry failed order import
   */
  async retryImport(linkId: string, sellerId: string): Promise<ChannelOrderLink> {
    const link = await this.getOrderLinkById(linkId, sellerId);

    if (link.status !== ChannelOrderStatus.FAILED) {
      throw new Error('Only failed imports can be retried');
    }

    if (!link.canRetry()) {
      throw new Error('Maximum retry attempts exceeded');
    }

    try {
      // Try to create internal order again
      const externalOrder = link.externalOrderData as ExternalOrder;
      const internalOrder = await this.createInternalOrder(sellerId, externalOrder);

      // Update link
      link.markImported(internalOrder.id);
      await this.linkRepository.save(link);

      return link;
    } catch (error) {
      // Update error message
      link.markFailed(error instanceof Error ? error.message : 'Unknown error');
      await this.linkRepository.save(link);

      throw error;
    }
  }

  /**
   * Get import statistics
   */
  async getImportStats(sellerId: string, channelAccountId: string): Promise<{
    total: number;
    imported: number;
    failed: number;
    pending: number;
  }> {
    // Verify account ownership
    await channelManagementService.getChannelAccountById(channelAccountId, sellerId);

    const links = await this.linkRepository.find({
      where: { channelAccountId },
    });

    const stats = {
      total: links.length,
      imported: 0,
      failed: 0,
      pending: 0,
    };

    for (const link of links) {
      if (link.status === ChannelOrderStatus.IMPORTED) {
        stats.imported++;
      } else if (link.status === ChannelOrderStatus.FAILED) {
        stats.failed++;
      } else if (link.status === ChannelOrderStatus.IMPORT_PENDING) {
        stats.pending++;
      }
    }

    return stats;
  }
}

export const channelOrderService = new ChannelOrderService();
