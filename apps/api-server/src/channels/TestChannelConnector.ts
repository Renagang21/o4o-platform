import type {
  IChannelConnector,
  ExportProductsParams,
  ExportResult,
  ImportOrdersParams,
  ImportOrdersResult,
  ExternalOrder,
  ExternalOrderItem
} from './IChannelConnector.js';
import logger from '../utils/logger.js';

/**
 * Test Channel Connector
 * Phase PD-9: Multichannel RPA 1차
 *
 * Mock connector for testing RPA flow without actual external API.
 * Simulates product export and order import for internal testing.
 */
export class TestChannelConnector implements IChannelConnector {
  public readonly channelCode = 'test_channel';

  // In-memory storage for test orders (for simulation)
  private testOrders: ExternalOrder[] = [];

  /**
   * Export products to test channel
   * Simulates successful export by generating fake external IDs
   */
  async exportProducts(params: ExportProductsParams): Promise<ExportResult> {
    const { account, links } = params;

    logger.info(`[TestChannelConnector] Exporting ${links.length} products for account ${account.id}`);

    const successful: ExportResult['successful'] = [];
    const failed: ExportResult['failed'] = [];

    for (const link of links) {
      try {
        // Simulate API delay
        await this.delay(100);

        // Generate fake external product ID
        const externalProductId = `TEST-${link.sellerProductId.substring(0, 8).toUpperCase()}`;
        const externalUrl = `https://test-channel.local/products/${externalProductId}`;

        successful.push({
          linkId: link.id,
          externalProductId,
          externalUrl,
        });

        logger.debug(`[TestChannelConnector] Exported product ${link.sellerProductId} -> ${externalProductId}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        failed.push({
          linkId: link.id,
          error: errorMessage,
        });

        logger.error(`[TestChannelConnector] Failed to export product ${link.sellerProductId}:`, error);
      }
    }

    return { successful, failed };
  }

  /**
   * Import orders from test channel
   * Returns mock orders from internal storage or generates dummy orders
   */
  async importOrders(params: ImportOrdersParams): Promise<ImportOrdersResult> {
    const { account, since, limit = 10 } = params;

    logger.info(`[TestChannelConnector] Importing orders for account ${account.id}`, { since, limit });

    // Simulate API delay
    await this.delay(200);

    // Filter orders by date if provided
    let orders = this.testOrders;
    if (since) {
      orders = orders.filter(order => order.externalOrderDate >= since);
    }

    // Apply limit
    const limitedOrders = orders.slice(0, limit);

    logger.debug(`[TestChannelConnector] Found ${limitedOrders.length} orders`);

    return {
      orders: limitedOrders,
      total: orders.length,
      hasMore: orders.length > limit,
    };
  }

  /**
   * Add a test order to the internal storage
   * For testing purposes only
   */
  public addTestOrder(order: Partial<ExternalOrder>): void {
    const completeOrder: ExternalOrder = {
      externalOrderId: order.externalOrderId || `TEST-ORDER-${Date.now()}`,
      externalOrderDate: order.externalOrderDate || new Date(),
      buyerName: order.buyerName || '테스트 구매자',
      buyerEmail: order.buyerEmail || 'test@example.com',
      buyerPhone: order.buyerPhone || '010-1234-5678',
      items: order.items || this.generateTestItems(),
      summary: order.summary || {
        subtotal: 100000,
        shipping: 3000,
        tax: 0,
        discount: 0,
        total: 103000,
      },
      shippingAddress: order.shippingAddress || {
        recipientName: '테스트 수령인',
        phone: '010-1234-5678',
        zipCode: '06234',
        address: '서울시 강남구 테헤란로 123',
        detailAddress: '테스트빌딩 101호',
        city: '서울',
        country: 'KR',
        deliveryRequest: '문 앞에 놔주세요',
      },
      paymentMethod: 'card',
      paymentStatus: 'completed',
      metadata: order.metadata || {},
    };

    this.testOrders.push(completeOrder);
    logger.debug(`[TestChannelConnector] Added test order: ${completeOrder.externalOrderId}`);
  }

  /**
   * Clear all test orders
   * For testing purposes only
   */
  public clearTestOrders(): void {
    this.testOrders = [];
    logger.debug('[TestChannelConnector] Cleared all test orders');
  }

  /**
   * Get current test orders count
   */
  public getTestOrdersCount(): number {
    return this.testOrders.length;
  }

  /**
   * Validate credentials (always returns true for test channel)
   */
  async validateCredentials(): Promise<boolean> {
    await this.delay(100);
    return true;
  }

  /**
   * Get channel metadata
   */
  async getChannelMetadata(): Promise<Record<string, any>> {
    return {
      channelCode: this.channelCode,
      name: '테스트 채널',
      type: 'test',
      capabilities: {
        exportProducts: true,
        importOrders: true,
        syncInventory: false,
        webhooks: false,
      },
      limits: {
        maxProductsPerExport: 100,
        maxOrdersPerImport: 100,
        rateLimit: null,
      },
    };
  }

  /**
   * Generate test order items
   */
  private generateTestItems(): ExternalOrderItem[] {
    return [
      {
        externalProductId: `TEST-PROD-${Math.random().toString(36).substring(7)}`,
        productName: '테스트 상품 1',
        quantity: 2,
        unitPrice: 50000,
        totalPrice: 100000,
        options: {
          color: '블랙',
          size: 'L',
        },
      },
    ];
  }

  /**
   * Simulate async delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
