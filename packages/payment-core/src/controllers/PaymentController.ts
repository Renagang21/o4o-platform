/**
 * PaymentController
 *
 * WO-O4O-PAYMENT-CORE-V0.1
 *
 * Payment Core v0.1 API 컨트롤러
 *
 * 6개 핵심 API:
 * 1. POST /api/payments/prepare        - 결제 요청 생성
 * 2. POST /api/payments/pg/callback    - PG 콜백 수신
 * 3. POST /api/payments/:id/confirm    - 서버 측 검증 ⭐
 * 4. GET /api/payments/:id             - 결제 상태 조회
 * 5. GET /api/payment-events           - 이벤트 로그 조회
 * 6. GET /api/payments/health          - 헬스 체크
 */

import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { PaymentCoreService } from '../services/PaymentCoreService.js';
import { PaymentEventService, EventQueryOptions } from '../services/PaymentEventService.js';
import {
  PreparePaymentRequest,
  ConfirmPaymentRequest,
  PGCallbackRequest,
  PaymentApiResponse,
  PreparePaymentResponse,
  ConfirmPaymentResponse,
  PaymentStatusResponse,
  PaymentHealthResponse,
} from '../types/PaymentTypes.js';
import { PaymentEventLog } from '../entities/PaymentEventLog.entity.js';
import { PaymentEventType } from '../types/PaymentEvents.js';

@Controller('api/payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentCoreService,
    private readonly eventService: PaymentEventService
  ) {}

  /**
   * POST /api/payments/prepare
   *
   * 결제 요청 생성
   */
  @Post('prepare')
  async prepare(
    @Body() request: PreparePaymentRequest
  ): Promise<PaymentApiResponse<PreparePaymentResponse>> {
    try {
      const result = await this.paymentService.prepare(request);
      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to prepare payment',
        code: 'PREPARE_FAILED',
      };
    }
  }

  /**
   * POST /api/payments/pg/callback
   *
   * PG 콜백 수신
   *
   * Toss Payments는 클라이언트 리다이렉트 방식을 사용하므로
   * 이 엔드포인트는 향후 웹훅 지원용으로 예약
   */
  @Post('pg/callback')
  async pgCallback(
    @Body() request: PGCallbackRequest
  ): Promise<PaymentApiResponse> {
    try {
      // v0.1: 로깅만 수행 (Toss는 리다이렉트 방식)
      console.log('[Payment Core] PG Callback received:', {
        paymentKey: request.paymentKey,
        orderId: request.orderId,
        amount: request.amount,
      });

      return {
        success: true,
        data: { received: true },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Callback processing failed',
        code: 'CALLBACK_FAILED',
      };
    }
  }

  /**
   * POST /api/payments/:id/confirm
   *
   * 서버 측 결제 검증 ⭐
   *
   * 핵심 API: PG 승인 + 상태 업데이트 + payment.completed 이벤트 발행
   */
  @Post(':id/confirm')
  async confirm(
    @Param('id') paymentId: string,
    @Body() request: ConfirmPaymentRequest
  ): Promise<PaymentApiResponse<ConfirmPaymentResponse>> {
    try {
      const result = await this.paymentService.confirm(paymentId, request);
      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Payment confirmation failed',
        code: error.code || 'CONFIRM_FAILED',
      };
    }
  }

  /**
   * GET /api/payments/:id
   *
   * 결제 상태 조회
   */
  @Get(':id')
  async getStatus(
    @Param('id') paymentId: string
  ): Promise<PaymentApiResponse<PaymentStatusResponse>> {
    try {
      const result = await this.paymentService.getStatus(paymentId);
      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get payment status',
        code: 'STATUS_FAILED',
      };
    }
  }

  /**
   * GET /api/payments/health
   *
   * 헬스 체크
   */
  @Get('health')
  getHealth(): PaymentApiResponse<PaymentHealthResponse> {
    try {
      const result = this.paymentService.getHealth();
      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Health check failed',
        code: 'HEALTH_FAILED',
      };
    }
  }
}

/**
 * PaymentEventController
 *
 * 이벤트 로그 조회 전용 컨트롤러
 */
@Controller('api/payment-events')
export class PaymentEventController {
  constructor(private readonly eventService: PaymentEventService) {}

  /**
   * GET /api/payment-events
   *
   * 이벤트 로그 조회
   *
   * Query params:
   * - paymentId: 결제 ID 필터
   * - orderId: 주문 ID 필터
   * - eventTypes: 이벤트 타입 필터 (쉼표 구분)
   * - fromDate: 시작 날짜
   * - toDate: 종료 날짜
   * - limit: 결과 제한 (기본: 50)
   * - offset: 오프셋
   */
  @Get()
  async getEvents(
    @Query('paymentId') paymentId?: string,
    @Query('orderId') orderId?: string,
    @Query('eventTypes') eventTypesStr?: string,
    @Query('fromDate') fromDateStr?: string,
    @Query('toDate') toDateStr?: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string
  ): Promise<PaymentApiResponse<PaymentEventLog[]>> {
    try {
      const options: EventQueryOptions = {};

      if (paymentId) options.paymentId = paymentId;
      if (orderId) options.orderId = orderId;

      if (eventTypesStr) {
        options.eventTypes = eventTypesStr
          .split(',')
          .map((t) => t.trim() as PaymentEventType);
      }

      if (fromDateStr) options.fromDate = new Date(fromDateStr);
      if (toDateStr) options.toDate = new Date(toDateStr);

      options.limit = limitStr ? parseInt(limitStr, 10) : 50;
      if (offsetStr) options.offset = parseInt(offsetStr, 10);

      const events = await this.eventService.findEvents(options);

      return {
        success: true,
        data: events,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get events',
        code: 'EVENTS_FAILED',
      };
    }
  }

  /**
   * GET /api/payment-events/payment/:paymentId
   *
   * 특정 결제의 이벤트 조회
   */
  @Get('payment/:paymentId')
  async getEventsByPaymentId(
    @Param('paymentId') paymentId: string
  ): Promise<PaymentApiResponse<PaymentEventLog[]>> {
    try {
      const events = await this.eventService.findByPaymentId(paymentId);
      return {
        success: true,
        data: events,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get events',
        code: 'EVENTS_FAILED',
      };
    }
  }

  /**
   * GET /api/payment-events/order/:orderId
   *
   * 특정 주문의 결제 이벤트 조회
   */
  @Get('order/:orderId')
  async getEventsByOrderId(
    @Param('orderId') orderId: string
  ): Promise<PaymentApiResponse<PaymentEventLog[]>> {
    try {
      const events = await this.eventService.findByOrderId(orderId);
      return {
        success: true,
        data: events,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get events',
        code: 'EVENTS_FAILED',
      };
    }
  }
}
