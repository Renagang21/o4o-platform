/**
 * EcommerceOrder Controller
 *
 * API: /api/v1/ecommerce/orders
 */

import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { EcommerceOrderService } from '../services/EcommerceOrderService.js';
import type { CreateOrderDto } from '../services/EcommerceOrderService.js';
import { EcommerceOrder, OrderType, OrderStatus, PaymentStatus } from '../entities/EcommerceOrder.entity.js';

@Controller('api/v1/ecommerce/orders')
export class EcommerceOrderController {
  constructor(private readonly orderService: EcommerceOrderService) {}

  /**
   * 주문 목록 조회
   */
  @Get()
  async findAll(
    @Query('buyerId') buyerId?: string,
    @Query('sellerId') sellerId?: string,
    @Query('orderType') orderType?: OrderType,
    @Query('status') status?: OrderStatus,
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ): Promise<{ orders: EcommerceOrder[]; total: number }> {
    return await this.orderService.findAll({
      buyerId,
      sellerId,
      orderType,
      status,
      paymentStatus,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  /**
   * 주문 상세 조회 (ID)
   */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<EcommerceOrder> {
    const order = await this.orderService.findById(id);
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
  }

  /**
   * 주문 상세 조회 (주문 번호)
   */
  @Get('number/:orderNumber')
  async findByOrderNumber(@Param('orderNumber') orderNumber: string): Promise<EcommerceOrder> {
    const order = await this.orderService.findByOrderNumber(orderNumber);
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
  }

  /**
   * 주문 생성
   */
  @Post()
  async create(@Body() dto: CreateOrderDto): Promise<EcommerceOrder> {
    return await this.orderService.create(dto);
  }

  /**
   * 주문 상태 업데이트
   */
  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus
  ): Promise<EcommerceOrder> {
    return await this.orderService.updateStatus(id, status);
  }

  /**
   * 결제 상태 업데이트
   */
  @Put(':id/payment-status')
  async updatePaymentStatus(
    @Param('id') id: string,
    @Body('paymentStatus') paymentStatus: PaymentStatus,
    @Body('paymentMethod') paymentMethod?: string
  ): Promise<EcommerceOrder> {
    return await this.orderService.updatePaymentStatus(id, paymentStatus, paymentMethod);
  }

  /**
   * 주문 취소
   */
  @Post(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason?: string
  ): Promise<EcommerceOrder> {
    return await this.orderService.cancel(id, reason);
  }
}
