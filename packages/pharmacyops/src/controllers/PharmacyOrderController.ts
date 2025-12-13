/**
 * PharmacyOrderController
 *
 * 약국 주문 관리 API
 *
 * @package @o4o/pharmacyops
 */

import { Controller, Get, Post, Body, Query, Param, Req, UseGuards } from '@nestjs/common';
import { PharmacyOrderService } from '../services/PharmacyOrderService.js';
import { PharmacyAuthGuard, getPharmacyId } from '../guards/PharmacyAuthGuard.js';
import type { CreatePharmacyOrderDto, OrderStatus, PaymentStatus } from '../dto/index.js';

@Controller('pharmacyops/orders')
@UseGuards(PharmacyAuthGuard)
export class PharmacyOrderController {
  constructor(private readonly orderService: PharmacyOrderService) {}

  /**
   * GET /api/v1/pharmacyops/orders
   * 주문 목록 조회
   */
  @Get()
  async list(
    @Req() req: any,
    @Query('status') status?: OrderStatus,
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
    @Query('supplierId') supplierId?: string,
    @Query('productId') productId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    const pharmacyId = getPharmacyId(req);

    return this.orderService.list(pharmacyId, {
      status,
      paymentStatus,
      supplierId,
      productId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      sortBy,
      sortOrder,
    });
  }

  /**
   * GET /api/v1/pharmacyops/orders/recent
   * 최근 주문 조회
   */
  @Get('recent')
  async getRecentOrders(
    @Req() req: any,
    @Query('limit') limit?: string,
  ) {
    const pharmacyId = getPharmacyId(req);
    return this.orderService.getRecentOrders(
      pharmacyId,
      limit ? parseInt(limit) : 10,
    );
  }

  /**
   * GET /api/v1/pharmacyops/orders/active
   * 진행 중인 주문 조회
   */
  @Get('active')
  async getActiveOrders(@Req() req: any) {
    const pharmacyId = getPharmacyId(req);
    return this.orderService.getActiveOrders(pharmacyId);
  }

  /**
   * GET /api/v1/pharmacyops/orders/unpaid
   * 미결제 주문 조회
   */
  @Get('unpaid')
  async getUnpaidOrders(@Req() req: any) {
    const pharmacyId = getPharmacyId(req);
    return this.orderService.getUnpaidOrders(pharmacyId);
  }

  /**
   * GET /api/v1/pharmacyops/orders/:id
   * 주문 상세 조회
   */
  @Get(':id')
  async detail(@Req() req: any, @Param('id') id: string) {
    const pharmacyId = getPharmacyId(req);
    const order = await this.orderService.detail(pharmacyId, id);
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
  }

  /**
   * POST /api/v1/pharmacyops/orders/validate
   * 주문 유효성 검증
   */
  @Post('validate')
  async validateOrder(
    @Req() req: any,
    @Body() dto: CreatePharmacyOrderDto,
  ) {
    const pharmacyId = getPharmacyId(req);
    return this.orderService.validateOrder(pharmacyId, dto);
  }

  /**
   * POST /api/v1/pharmacyops/orders
   * 주문 생성
   */
  @Post()
  async create(
    @Req() req: any,
    @Body() dto: CreatePharmacyOrderDto,
  ) {
    const pharmacyId = getPharmacyId(req);
    return this.orderService.create(pharmacyId, dto);
  }

  /**
   * POST /api/v1/pharmacyops/orders/:id/cancel
   * 주문 취소
   */
  @Post(':id/cancel')
  async cancel(
    @Req() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    const pharmacyId = getPharmacyId(req);
    return this.orderService.cancel(pharmacyId, id, reason);
  }

  /**
   * GET /api/v1/pharmacyops/orders/number/:orderNumber
   * 주문 번호로 조회
   */
  @Get('number/:orderNumber')
  async findByOrderNumber(
    @Req() req: any,
    @Param('orderNumber') orderNumber: string,
  ) {
    const pharmacyId = getPharmacyId(req);
    const order = await this.orderService.findByOrderNumber(pharmacyId, orderNumber);
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
  }

  /**
   * GET /api/v1/pharmacyops/orders/:id/reorder
   * 재주문 DTO 생성
   */
  @Get(':id/reorder')
  async reorder(@Req() req: any, @Param('id') id: string) {
    const pharmacyId = getPharmacyId(req);
    const reorderDto = await this.orderService.reorder(pharmacyId, id);
    if (!reorderDto) {
      throw new Error('Cannot create reorder');
    }
    return reorderDto;
  }
}
