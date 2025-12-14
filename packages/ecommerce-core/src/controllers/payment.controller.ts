/**
 * EcommercePayment Controller
 *
 * API: /api/v1/ecommerce/payments
 */

import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { EcommercePaymentService } from '../services/EcommercePaymentService.js';
import type {
  CreatePaymentDto,
  CompletePaymentDto,
  RefundPaymentDto,
} from '../services/EcommercePaymentService.js';
import { EcommercePayment } from '../entities/EcommercePayment.entity.js';

@Controller('api/v1/ecommerce/payments')
export class EcommercePaymentController {
  constructor(private readonly paymentService: EcommercePaymentService) {}

  /**
   * 결제 상세 조회 (ID)
   */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<EcommercePayment> {
    const payment = await this.paymentService.findById(id);
    if (!payment) {
      throw new Error('Payment not found');
    }
    return payment;
  }

  /**
   * 결제 상세 조회 (트랜잭션 ID)
   */
  @Get('transaction/:transactionId')
  async findByTransactionId(
    @Param('transactionId') transactionId: string
  ): Promise<EcommercePayment> {
    const payment = await this.paymentService.findByTransactionId(transactionId);
    if (!payment) {
      throw new Error('Payment not found');
    }
    return payment;
  }

  /**
   * 주문별 결제 목록 조회
   */
  @Get('order/:orderId')
  async findByOrderId(@Param('orderId') orderId: string): Promise<EcommercePayment[]> {
    return await this.paymentService.findByOrderId(orderId);
  }

  /**
   * 결제 요청 생성
   */
  @Post()
  async createPayment(@Body() dto: CreatePaymentDto): Promise<EcommercePayment> {
    return await this.paymentService.createPayment(dto);
  }

  /**
   * 결제 완료 처리
   */
  @Post(':id/complete')
  async completePayment(
    @Param('id') id: string,
    @Body() dto: CompletePaymentDto
  ): Promise<EcommercePayment> {
    return await this.paymentService.completePayment(id, dto);
  }

  /**
   * 결제 실패 처리
   */
  @Post(':id/fail')
  async failPayment(
    @Param('id') id: string,
    @Body('reason') reason: string
  ): Promise<EcommercePayment> {
    return await this.paymentService.failPayment(id, reason);
  }

  /**
   * 환불 처리
   */
  @Post(':id/refund')
  async refundPayment(
    @Param('id') id: string,
    @Body() dto: RefundPaymentDto
  ): Promise<EcommercePayment> {
    return await this.paymentService.refundPayment(id, dto);
  }
}
