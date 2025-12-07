/**
 * Relay Controller
 *
 * API: /api/v1/dropshipping/core/orders/relay
 */

import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { OrderRelayService } from '../services/OrderRelayService.js';
import { OrderRelay } from '../entities/OrderRelay.entity.js';

@Controller('api/v1/dropshipping/core/orders/relay')
export class RelayController {
  constructor(private readonly orderService: OrderRelayService) {}

  @Post()
  async relayOrder(@Body('orderId') orderId: string): Promise<OrderRelay> {
    return await this.orderService.relayToSupplier(orderId);
  }

  @Get(':id')
  async getRelayStatus(@Param('id') id: string): Promise<OrderRelay> {
    const order = await this.orderService.findById(id);
    if (!order) {
      throw new Error('Order relay not found');
    }
    return order;
  }

  @Post(':id/confirm')
  async confirmOrder(@Param('id') id: string): Promise<OrderRelay> {
    return await this.orderService.confirmOrder(id);
  }

  @Post(':id/ship')
  async shipOrder(
    @Param('id') id: string,
    @Body() shippingInfo?: Record<string, any>
  ): Promise<OrderRelay> {
    return await this.orderService.shipOrder(id, shippingInfo);
  }

  @Post(':id/deliver')
  async deliverOrder(@Param('id') id: string): Promise<OrderRelay> {
    return await this.orderService.deliverOrder(id);
  }
}
