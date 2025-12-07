/**
 * Orders Controller
 *
 * API: /api/v1/dropshipping/core/orders
 */

import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { OrderRelayService } from '../services/OrderRelayService.js';
import { OrderRelay, OrderRelayStatus } from '../entities/OrderRelay.entity.js';

@Controller('api/v1/dropshipping/core/orders')
export class OrdersController {
  constructor(private readonly orderService: OrderRelayService) {}

  @Get()
  async findAll(
    @Query('status') status?: OrderRelayStatus,
    @Query('listingId') listingId?: string
  ): Promise<OrderRelay[]> {
    return await this.orderService.findAll({ status, listingId });
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<OrderRelay> {
    const order = await this.orderService.findById(id);
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
  }

  @Post()
  async create(@Body() data: Partial<OrderRelay>): Promise<OrderRelay> {
    return await this.orderService.createOrder(data);
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string): Promise<OrderRelay> {
    return await this.orderService.cancelOrder(id);
  }

  @Post(':id/refund')
  async refund(@Param('id') id: string): Promise<OrderRelay> {
    return await this.orderService.refundOrder(id);
  }
}
