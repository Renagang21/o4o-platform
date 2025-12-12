/**
 * Pharma Orders Controller
 *
 * API: /api/v1/pharma/orders
 *
 * PharmaOrder CRUD operations
 * 의약품 주문 관리 - 약국(PHARMACY)만 주문 가능
 *
 * @package @o4o/pharmaceutical-core
 */

import { Controller, Get, Post, Put, Req, Body, Param, Query } from '@nestjs/common';
import {
  PharmaOrderService,
  type CreatePharmaOrderDto,
  type PharmaOrderFilter,
} from '../services/PharmaOrderService.js';
import { PharmaOrderStatus, PharmaPaymentStatus } from '../entities/PharmaOrder.entity.js';

@Controller('api/v1/pharma/orders')
export class OrdersController {
  constructor(private readonly orderService: PharmaOrderService) {}

  /**
   * 주문 목록 조회
   */
  @Get()
  async getOrders(
    @Req() req: any,
    @Query('status') status?: PharmaOrderStatus,
    @Query('paymentStatus') paymentStatus?: PharmaPaymentStatus,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    // 약국 ID (sellerId) 또는 공급자 ID (supplierId)로 필터링
    const pharmacyId = req.user?.sellerId || req.query.pharmacyId;
    const supplierId = req.user?.supplierId || req.query.supplierId;

    const filter: PharmaOrderFilter = {
      pharmacyId,
      supplierId,
      status,
      paymentStatus,
      startDate: dateFrom ? new Date(dateFrom) : undefined,
      endDate: dateTo ? new Date(dateTo) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    };

    return await this.orderService.findAll(filter);
  }

  /**
   * 주문 상세 조회
   */
  @Get(':id')
  async getOrder(@Param('id') id: string) {
    const order = await this.orderService.findById(id);
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
  }

  /**
   * 주문 번호로 조회
   */
  @Get('by-number/:orderNumber')
  async getOrderByNumber(@Param('orderNumber') orderNumber: string) {
    const order = await this.orderService.findByOrderNumber(orderNumber);
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
  }

  /**
   * 약국별 주문 목록 조회
   */
  @Get('pharmacy/:pharmacyId')
  async getOrdersByPharmacy(
    @Param('pharmacyId') pharmacyId: string,
    @Query('status') status?: PharmaOrderStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return await this.orderService.findByPharmacyId(pharmacyId, {
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  /**
   * 공급자별 주문 목록 조회
   */
  @Get('supplier/:supplierId')
  async getOrdersBySupplier(
    @Param('supplierId') supplierId: string,
    @Query('status') status?: PharmaOrderStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return await this.orderService.findBySupplierId(supplierId, {
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  /**
   * 약국 통계 조회
   */
  @Get('pharmacy/:pharmacyId/stats')
  async getPharmacyStats(@Param('pharmacyId') pharmacyId: string) {
    return await this.orderService.getPharmacyStats(pharmacyId);
  }

  /**
   * 주문 생성
   * 약국(PHARMACY)만 주문 가능
   */
  @Post()
  async createOrder(
    @Req() req: any,
    @Body() dto: CreatePharmaOrderDto
  ) {
    const pharmacyId = req.user?.sellerId || dto.pharmacyId;
    if (!pharmacyId) {
      throw new Error('Pharmacy ID is required');
    }

    // 약국 유형 검증 (서비스 레벨에서도 검증됨)
    const sellerType = req.user?.sellerType;
    if (sellerType && sellerType !== 'pharmacy') {
      throw new Error('Only pharmacy can order pharmaceutical products');
    }

    return await this.orderService.create({
      ...dto,
      pharmacyId,
    });
  }

  /**
   * 주문 상태 변경
   */
  @Put(':id/status')
  async updateOrderStatus(
    @Param('id') id: string,
    @Body('status') status: PharmaOrderStatus,
    @Body('notes') notes?: string
  ) {
    const order = await this.orderService.updateStatus(id, status, { notes });
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
  }

  /**
   * 결제 상태 변경
   */
  @Put(':id/payment-status')
  async updatePaymentStatus(
    @Param('id') id: string,
    @Body('paymentStatus') paymentStatus: PharmaPaymentStatus
  ) {
    const order = await this.orderService.updatePaymentStatus(id, paymentStatus);
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
  }

  /**
   * 주문 승인 (공급자)
   */
  @Put(':id/approve')
  async approveOrder(@Param('id') id: string) {
    const order = await this.orderService.updateStatus(id, PharmaOrderStatus.CONFIRMED);
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
  }

  /**
   * 주문 거부 (공급자)
   */
  @Put(':id/reject')
  async rejectOrder(
    @Param('id') id: string,
    @Body('reason') reason?: string
  ) {
    const order = await this.orderService.updateStatus(id, PharmaOrderStatus.CANCELLED, {
      cancellationReason: reason,
    });
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
  }

  /**
   * 주문 취소 (약국)
   */
  @Put(':id/cancel')
  async cancelOrder(
    @Param('id') id: string,
    @Body('reason') reason?: string
  ) {
    const order = await this.orderService.cancel(id, reason || '약국 요청으로 취소');
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
  }

  /**
   * 배송 정보 업데이트
   */
  @Put(':id/shipping')
  async updateShipping(
    @Param('id') id: string,
    @Body('carrier') carrier: string,
    @Body('trackingNumber') trackingNumber: string,
    @Body('trackingUrl') trackingUrl?: string
  ) {
    const order = await this.orderService.updateStatus(id, PharmaOrderStatus.SHIPPED, {
      trackingInfo: { carrier, trackingNumber, trackingUrl },
    });
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
  }
}
