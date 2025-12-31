/**
 * Dropshipping Admin Controller
 *
 * DS-4 준수 Admin API
 *
 * API Prefix: /api/v1/dropshipping/admin/*
 *
 * ## 제공 기능
 * - OrderRelay CRUD + 상태 관리
 * - Settlement CRUD + 계산/확정
 *
 * ## 권한
 * - Admin 역할 필수
 * - SERVICE_GROUP 미들웨어로 보호
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrderRelayService, CreateOrderRelayDto, UpdateStatusDto } from '../services/OrderRelayService.js';
import { SettlementService, CreateSettlementBatchDto } from '../services/SettlementService.js';
import { OrderRelayStatus } from '../entities/OrderRelay.entity.js';
import { SettlementBatchStatus, SettlementType } from '../entities/SettlementBatch.entity.js';

// 요청 DTO
interface CreateOrderRelayRequestDto {
  listingId: string;
  ecommerceOrderId?: string;
  externalOrderId?: string;
  quantity: number;
  unitPrice: number;
  customerInfo?: Record<string, any>;
  shippingInfo?: Record<string, any>;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

interface UpdateOrderRelayStatusRequestDto {
  status: OrderRelayStatus;
  reason?: string;
  shippingInfo?: Record<string, any>;
}

interface CreateSettlementBatchRequestDto {
  sellerId?: string;
  supplierId?: string;
  settlementType: SettlementType;
  periodStart: string; // ISO date string
  periodEnd: string; // ISO date string
  metadata?: Record<string, any>;
}

interface MarkAsFailedRequestDto {
  reason: string;
}

// 쿼리 DTO
interface OrderRelayQueryDto {
  status?: OrderRelayStatus;
  listingId?: string;
  sellerId?: string;
  ecommerceOrderId?: string;
  page?: number;
  limit?: number;
}

interface SettlementQueryDto {
  status?: SettlementBatchStatus;
  settlementType?: SettlementType;
  sellerId?: string;
  supplierId?: string;
  page?: number;
  limit?: number;
}

@Controller('dropshipping/admin')
export class DropshippingAdminController {
  constructor(
    private readonly orderRelayService: OrderRelayService,
    private readonly settlementService: SettlementService
  ) {}

  // ==================== Order Relay APIs ====================

  /**
   * POST /api/v1/dropshipping/admin/order-relays
   * 주문 Relay 생성
   */
  @Post('order-relays')
  @HttpCode(HttpStatus.CREATED)
  async createOrderRelay(
    @Body() dto: CreateOrderRelayRequestDto
    // TODO: @CurrentUser() user로 actor 정보 추출
  ) {
    const actor = { actorId: 'admin', actorType: 'admin' as const };
    const orderRelay = await this.orderRelayService.create(dto, actor);
    return {
      success: true,
      data: orderRelay,
    };
  }

  /**
   * GET /api/v1/dropshipping/admin/order-relays
   * 주문 Relay 목록 조회
   */
  @Get('order-relays')
  async getOrderRelays(@Query() query: OrderRelayQueryDto) {
    const result = await this.orderRelayService.findAll({
      status: query.status,
      listingId: query.listingId,
      sellerId: query.sellerId,
      ecommerceOrderId: query.ecommerceOrderId,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
    });
    return {
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  /**
   * GET /api/v1/dropshipping/admin/order-relays/:id
   * 주문 Relay 상세 조회
   */
  @Get('order-relays/:id')
  async getOrderRelay(@Param('id', ParseUUIDPipe) id: string) {
    const orderRelay = await this.orderRelayService.findById(id);
    if (!orderRelay) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `OrderRelay not found: ${id}`,
        },
      };
    }
    return {
      success: true,
      data: orderRelay,
    };
  }

  /**
   * PATCH /api/v1/dropshipping/admin/order-relays/:id/status
   * 주문 Relay 상태 변경
   */
  @Patch('order-relays/:id/status')
  async updateOrderRelayStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderRelayStatusRequestDto
  ) {
    const actor = { actorId: 'admin', actorType: 'admin' as const };
    const orderRelay = await this.orderRelayService.updateStatus(id, dto, actor);
    return {
      success: true,
      data: orderRelay,
    };
  }

  /**
   * GET /api/v1/dropshipping/admin/order-relays/:id/logs
   * 주문 Relay 로그 조회
   */
  @Get('order-relays/:id/logs')
  async getOrderRelayLogs(@Param('id', ParseUUIDPipe) id: string) {
    const logs = await this.orderRelayService.findLogs(id);
    return {
      success: true,
      data: logs,
    };
  }

  // ==================== Settlement APIs ====================

  /**
   * POST /api/v1/dropshipping/admin/settlements/batches
   * 정산 배치 생성
   */
  @Post('settlements/batches')
  @HttpCode(HttpStatus.CREATED)
  async createSettlementBatch(@Body() dto: CreateSettlementBatchRequestDto) {
    const actor = { actorId: 'admin', actorType: 'admin' as const };
    const batch = await this.settlementService.create(
      {
        sellerId: dto.sellerId,
        supplierId: dto.supplierId,
        settlementType: dto.settlementType,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        metadata: dto.metadata,
      },
      actor
    );
    return {
      success: true,
      data: batch,
    };
  }

  /**
   * GET /api/v1/dropshipping/admin/settlements/batches
   * 정산 배치 목록 조회
   */
  @Get('settlements/batches')
  async getSettlementBatches(@Query() query: SettlementQueryDto) {
    const result = await this.settlementService.findAll({
      status: query.status,
      settlementType: query.settlementType,
      sellerId: query.sellerId,
      supplierId: query.supplierId,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
    });
    return {
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  /**
   * GET /api/v1/dropshipping/admin/settlements/batches/:id
   * 정산 배치 상세 조회
   */
  @Get('settlements/batches/:id')
  async getSettlementBatch(@Param('id', ParseUUIDPipe) id: string) {
    const batch = await this.settlementService.findById(id);
    if (!batch) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `SettlementBatch not found: ${id}`,
        },
      };
    }
    return {
      success: true,
      data: batch,
    };
  }

  /**
   * GET /api/v1/dropshipping/admin/settlements/batches/:id/items
   * 정산 배치 항목 조회
   */
  @Get('settlements/batches/:id/items')
  async getSettlementBatchItems(@Param('id', ParseUUIDPipe) id: string) {
    const items = await this.settlementService.findItems(id);
    return {
      success: true,
      data: items,
    };
  }

  /**
   * GET /api/v1/dropshipping/admin/settlements/batches/:id/logs
   * 정산 배치 로그 조회
   */
  @Get('settlements/batches/:id/logs')
  async getSettlementBatchLogs(@Param('id', ParseUUIDPipe) id: string) {
    const logs = await this.settlementService.findLogs(id);
    return {
      success: true,
      data: logs,
    };
  }

  /**
   * POST /api/v1/dropshipping/admin/settlements/batches/:id/calculate
   * 정산 계산 실행
   */
  @Post('settlements/batches/:id/calculate')
  @HttpCode(HttpStatus.OK)
  async calculateSettlement(@Param('id', ParseUUIDPipe) id: string) {
    const actor = { actorId: 'admin', actorType: 'admin' as const };
    const batch = await this.settlementService.calculate(id, actor);
    return {
      success: true,
      data: batch,
    };
  }

  /**
   * POST /api/v1/dropshipping/admin/settlements/batches/:id/confirm
   * 정산 확정 (OPEN → CLOSED)
   */
  @Post('settlements/batches/:id/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmSettlement(@Param('id', ParseUUIDPipe) id: string) {
    const actor = { actorId: 'admin', actorType: 'admin' as const };
    const batch = await this.settlementService.confirm(id, actor);
    return {
      success: true,
      data: batch,
    };
  }

  /**
   * POST /api/v1/dropshipping/admin/settlements/batches/:id/start-processing
   * 처리 시작 (CLOSED → PROCESSING)
   */
  @Post('settlements/batches/:id/start-processing')
  @HttpCode(HttpStatus.OK)
  async startProcessingSettlement(@Param('id', ParseUUIDPipe) id: string) {
    const actor = { actorId: 'admin', actorType: 'admin' as const };
    const batch = await this.settlementService.startProcessing(id, actor);
    return {
      success: true,
      data: batch,
    };
  }

  /**
   * POST /api/v1/dropshipping/admin/settlements/batches/:id/mark-paid
   * 지급 완료 (PROCESSING → PAID)
   */
  @Post('settlements/batches/:id/mark-paid')
  @HttpCode(HttpStatus.OK)
  async markSettlementAsPaid(@Param('id', ParseUUIDPipe) id: string) {
    const actor = { actorId: 'finance', actorType: 'finance' as const };
    const batch = await this.settlementService.markAsPaid(id, actor);
    return {
      success: true,
      data: batch,
    };
  }

  /**
   * POST /api/v1/dropshipping/admin/settlements/batches/:id/mark-failed
   * 지급 실패 (PROCESSING → FAILED)
   */
  @Post('settlements/batches/:id/mark-failed')
  @HttpCode(HttpStatus.OK)
  async markSettlementAsFailed(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkAsFailedRequestDto
  ) {
    const actor = { actorId: 'finance', actorType: 'finance' as const };
    const batch = await this.settlementService.markAsFailed(id, dto.reason, actor);
    return {
      success: true,
      data: batch,
    };
  }

  /**
   * POST /api/v1/dropshipping/admin/settlements/batches/:id/retry
   * 재시도 (FAILED → PROCESSING)
   */
  @Post('settlements/batches/:id/retry')
  @HttpCode(HttpStatus.OK)
  async retrySettlement(@Param('id', ParseUUIDPipe) id: string) {
    const actor = { actorId: 'admin', actorType: 'admin' as const };
    const batch = await this.settlementService.retry(id, actor);
    return {
      success: true,
      data: batch,
    };
  }
}
