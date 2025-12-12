/**
 * Orders Controller
 *
 * API: /api/v1/sellerops/orders
 */

import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ProductType } from '@o4o/dropshipping-core';
import { OrderOpsService } from '../services/OrderOpsService.js';
import type { OrderListItemDto, OrderDetailDto } from '../dto/index.js';

@Controller('api/v1/sellerops/orders')
export class OrdersController {
  constructor(private readonly orderOpsService: OrderOpsService) {}

  @Get()
  async getOrders(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('relayStatus') relayStatus?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('productType') productType?: ProductType
  ): Promise<OrderListItemDto[]> {
    const sellerId = req.user?.sellerId || req.query.sellerId;
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }

    const filters: any = {};
    if (status) filters.status = status;
    if (relayStatus) filters.relayStatus = relayStatus;
    if (dateFrom) filters.dateFrom = new Date(dateFrom);
    if (dateTo) filters.dateTo = new Date(dateTo);
    if (productType) filters.productType = productType;

    return await this.orderOpsService.getOrders(sellerId, filters);
  }

  @Get('counts')
  async getOrderCounts(@Req() req: any): Promise<Record<string, number>> {
    const sellerId = req.user?.sellerId || req.query.sellerId;
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }
    return await this.orderOpsService.getOrderCounts(sellerId);
  }

  @Get(':id')
  async getOrder(
    @Param('id') id: string,
    @Req() req: any
  ): Promise<OrderDetailDto> {
    const sellerId = req.user?.sellerId || req.query.sellerId;
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }

    const order = await this.orderOpsService.getOrderById(id, sellerId);
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
  }
}
