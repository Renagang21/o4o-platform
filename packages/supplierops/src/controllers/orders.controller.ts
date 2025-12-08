/**
 * Orders Controller
 *
 * API: /api/v1/supplierops/orders
 */

import { Controller, Get, Put, Req, Body, Param } from '@nestjs/common';
import { OrderMonitorService } from '../services/OrderMonitorService.js';
import type { OrderRelayDto } from '../dto/index.js';

@Controller('api/v1/supplierops/orders')
export class OrdersController {
  constructor(private readonly orderService: OrderMonitorService) {}

  @Get()
  async getOrders(@Req() req: any): Promise<OrderRelayDto[]> {
    const supplierId = req.user?.supplierId || req.query.supplierId;
    if (!supplierId) {
      throw new Error('Supplier ID is required');
    }
    const relays = await this.orderService.getOrderRelays(supplierId);
    return relays.map((r) => ({
      id: r.id,
      orderId: r.orderId,
      sellerId: r.sellerId,
      sellerName: r.sellerName,
      productName: r.productName,
      quantity: r.quantity,
      totalPrice: r.totalPrice,
      status: r.status,
      trackingNumber: r.trackingNumber,
      createdAt: r.createdAt,
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

  @Put(':id/tracking')
  async updateTracking(
    @Param('id') id: string,
    @Body() body: { trackingNumber: string }
  ): Promise<OrderRelayDto> {
    const relay = await this.orderService.updateTracking(id, body.trackingNumber);
    return {
      id: relay.id,
      orderId: relay.orderId,
      sellerId: relay.sellerId,
      sellerName: relay.sellerName,
      productName: relay.productName,
      quantity: relay.quantity,
      totalPrice: relay.totalPrice,
      status: relay.status,
      trackingNumber: relay.trackingNumber,
      createdAt: relay.createdAt,
    };
  }
}
