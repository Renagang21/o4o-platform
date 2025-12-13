/**
 * Orders Controller
 *
 * API: /api/v1/supplierops/orders
 *
 * Phase 9-B: Core 정렬 업데이트
 * - OrderRelayStatus enum 정렬
 * - productType 필터링 지원
 * - 주문 상태 흐름 API 추가
 */

import { Controller, Get, Put, Post, Req, Body, Param, Query } from '@nestjs/common';
import { OrderMonitorService, OrderFilterOptions } from '../services/OrderMonitorService.js';
import type { OrderRelayDto, OrderFilterDto, ProductType, OrderRelayStatus } from '../dto/index.js';

@Controller('api/v1/supplierops/orders')
export class OrdersController {
  constructor(private readonly orderService: OrderMonitorService) {}

  @Get()
  async getOrders(
    @Req() req: any,
    @Query('productType') productType?: ProductType,
    @Query('status') status?: OrderRelayStatus,
    @Query('sellerId') sellerId?: string
  ): Promise<OrderRelayDto[]> {
    const supplierId = req.user?.supplierId || req.query.supplierId;
    if (!supplierId) {
      throw new Error('Supplier ID is required');
    }

    const filterOptions: OrderFilterOptions = {
      productType,
      status,
      sellerId,
    };

    const relays = await this.orderService.getOrderRelays(supplierId, filterOptions);
    return relays.map((r) => ({
      id: r.id,
      orderId: r.orderId,
      orderNumber: r.orderNumber,
      listingId: r.listingId,
      sellerId: r.sellerId,
      sellerName: r.sellerName,
      productName: r.productName,
      productType: r.productType,
      quantity: r.quantity,
      unitPrice: r.unitPrice,
      totalPrice: r.totalPrice,
      status: r.status,
      shippingInfo: r.shippingInfo,
      trackingNumber: r.trackingNumber,
      relayedAt: r.relayedAt,
      confirmedAt: r.confirmedAt,
      shippedAt: r.shippedAt,
      deliveredAt: r.deliveredAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  @Get('by-product-type/:productType')
  async getOrdersByProductType(
    @Req() req: any,
    @Param('productType') productType: ProductType
  ): Promise<OrderRelayDto[]> {
    const supplierId = req.user?.supplierId || req.query.supplierId;
    if (!supplierId) {
      throw new Error('Supplier ID is required');
    }

    const relays = await this.orderService.getOrderRelaysByProductType(supplierId, productType);
    return relays.map((r) => ({
      id: r.id,
      orderId: r.orderId,
      orderNumber: r.orderNumber,
      listingId: r.listingId,
      sellerId: r.sellerId,
      sellerName: r.sellerName,
      productName: r.productName,
      productType: r.productType,
      quantity: r.quantity,
      unitPrice: r.unitPrice,
      totalPrice: r.totalPrice,
      status: r.status,
      shippingInfo: r.shippingInfo,
      trackingNumber: r.trackingNumber,
      relayedAt: r.relayedAt,
      confirmedAt: r.confirmedAt,
      shippedAt: r.shippedAt,
      deliveredAt: r.deliveredAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  @Get('counts')
  async getOrderCounts(@Req() req: any): Promise<Record<string, number>> {
    const supplierId = req.user?.supplierId || req.query.supplierId;
    if (!supplierId) {
      throw new Error('Supplier ID is required');
    }
    return await this.orderService.getOrderCounts(supplierId);
  }

  @Post(':id/confirm')
  async confirmOrder(@Param('id') id: string): Promise<OrderRelayDto> {
    const relay = await this.orderService.confirmOrder(id);
    return {
      id: relay.id,
      orderId: relay.orderId,
      orderNumber: relay.orderNumber,
      sellerId: relay.sellerId,
      sellerName: relay.sellerName,
      productName: relay.productName,
      productType: relay.productType,
      quantity: relay.quantity,
      unitPrice: relay.unitPrice,
      totalPrice: relay.totalPrice,
      status: relay.status,
      confirmedAt: relay.confirmedAt,
      createdAt: relay.createdAt,
      updatedAt: relay.updatedAt,
    };
  }

  @Put(':id/tracking')
  async updateTracking(
    @Param('id') id: string,
    @Body() body: { trackingNumber: string; shippingInfo?: Record<string, any> }
  ): Promise<OrderRelayDto> {
    const relay = await this.orderService.updateTracking(id, body.trackingNumber, body.shippingInfo);
    return {
      id: relay.id,
      orderId: relay.orderId,
      orderNumber: relay.orderNumber,
      sellerId: relay.sellerId,
      sellerName: relay.sellerName,
      productName: relay.productName,
      productType: relay.productType,
      quantity: relay.quantity,
      unitPrice: relay.unitPrice,
      totalPrice: relay.totalPrice,
      status: relay.status,
      shippingInfo: relay.shippingInfo,
      trackingNumber: relay.trackingNumber,
      shippedAt: relay.shippedAt,
      createdAt: relay.createdAt,
      updatedAt: relay.updatedAt,
    };
  }

  @Post(':id/deliver')
  async markAsDelivered(@Param('id') id: string): Promise<OrderRelayDto> {
    const relay = await this.orderService.markAsDelivered(id);
    return {
      id: relay.id,
      orderId: relay.orderId,
      orderNumber: relay.orderNumber,
      sellerId: relay.sellerId,
      sellerName: relay.sellerName,
      productName: relay.productName,
      productType: relay.productType,
      quantity: relay.quantity,
      unitPrice: relay.unitPrice,
      totalPrice: relay.totalPrice,
      status: relay.status,
      deliveredAt: relay.deliveredAt,
      createdAt: relay.createdAt,
      updatedAt: relay.updatedAt,
    };
  }

  @Post(':id/cancel')
  async cancelOrder(
    @Param('id') id: string,
    @Body() body: { reason?: string }
  ): Promise<OrderRelayDto> {
    const relay = await this.orderService.cancelOrder(id, body.reason);
    return {
      id: relay.id,
      orderId: relay.orderId,
      orderNumber: relay.orderNumber,
      sellerId: relay.sellerId,
      sellerName: relay.sellerName,
      productName: relay.productName,
      productType: relay.productType,
      quantity: relay.quantity,
      unitPrice: relay.unitPrice,
      totalPrice: relay.totalPrice,
      status: relay.status,
      createdAt: relay.createdAt,
      updatedAt: relay.updatedAt,
    };
  }
}
