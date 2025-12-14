/**
 * Pharma Dispatch Controller
 *
 * API: /api/v1/pharma/dispatch
 *
 * PharmaDispatch CRUD operations
 * 의약품 배송/출고 관리 - 온도 관리, 마약류 추적 포함
 *
 * @package @o4o/pharmaceutical-core
 */

import { Controller, Get, Post, Put, Req, Body, Param, Query } from '@nestjs/common';
import {
  PharmaDispatchService,
  type CreatePharmaDispatchDto,
  type UpdatePharmaDispatchDto,
  type PharmaDispatchFilter,
} from '../services/PharmaDispatchService.js';
import type { PharmaDispatchStatus } from '../entities/PharmaDispatch.entity.js';

@Controller('api/v1/pharma/dispatch')
export class DispatchController {
  constructor(private readonly dispatchService: PharmaDispatchService) {}

  /**
   * 출고 목록 조회
   */
  @Get()
  async getDispatches(
    @Query('orderId') orderId?: string,
    @Query('status') status?: PharmaDispatchStatus,
    @Query('carrierName') carrierName?: string,
    @Query('requiresColdChain') requiresColdChain?: string,
    @Query('isNarcotics') isNarcotics?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const filter: PharmaDispatchFilter = {
      orderId,
      status,
      carrierName,
      requiresColdChain: requiresColdChain ? requiresColdChain === 'true' : undefined,
      isNarcotics: isNarcotics ? isNarcotics === 'true' : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    };

    return await this.dispatchService.find(filter);
  }

  /**
   * 출고 상세 조회
   */
  @Get(':id')
  async getDispatch(@Param('id') id: string) {
    const dispatch = await this.dispatchService.findById(id);
    if (!dispatch) {
      throw new Error('Dispatch not found');
    }
    return dispatch;
  }

  /**
   * 주문별 출고 조회
   */
  @Get('order/:orderId')
  async getDispatchByOrder(@Param('orderId') orderId: string) {
    const dispatch = await this.dispatchService.findByOrderId(orderId);
    if (!dispatch) {
      throw new Error('Dispatch not found');
    }
    return dispatch;
  }

  /**
   * 냉장/냉동 배송 목록 조회
   */
  @Get('cold-chain')
  async getColdChainDispatches(
    @Query('status') status?: PharmaDispatchStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return await this.dispatchService.findColdChainDispatches({
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  /**
   * 마약류 배송 목록 조회
   */
  @Get('narcotics')
  async getNarcoticsDispatches(
    @Query('status') status?: PharmaDispatchStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return await this.dispatchService.findNarcoticsDispatches({
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  /**
   * 출고 생성
   */
  @Post()
  async createDispatch(@Body() dto: CreatePharmaDispatchDto) {
    return await this.dispatchService.create(dto);
  }

  /**
   * 출고 정보 수정
   */
  @Put(':id')
  async updateDispatch(
    @Param('id') id: string,
    @Body() dto: UpdatePharmaDispatchDto
  ) {
    const dispatch = await this.dispatchService.update(id, dto);
    if (!dispatch) {
      throw new Error('Dispatch not found');
    }
    return dispatch;
  }

  /**
   * 출고 상태 변경
   */
  @Put(':id/status')
  async updateDispatchStatus(
    @Param('id') id: string,
    @Body('status') status: PharmaDispatchStatus
  ) {
    const dispatch = await this.dispatchService.updateStatus(id, status);
    if (!dispatch) {
      throw new Error('Dispatch not found');
    }
    return dispatch;
  }

  /**
   * 배송 추적 정보 업데이트
   */
  @Put(':id/tracking')
  async updateTracking(
    @Param('id') id: string,
    @Body('carrierName') carrierName: string,
    @Body('trackingNumber') trackingNumber: string,
    @Body('trackingUrl') trackingUrl?: string
  ) {
    const dispatch = await this.dispatchService.updateTracking(
      id,
      carrierName,
      trackingNumber,
      trackingUrl
    );
    if (!dispatch) {
      throw new Error('Dispatch not found');
    }
    return dispatch;
  }

  /**
   * 온도 로그 추가 (냉장/냉동 배송용)
   */
  @Post(':id/temperature-log')
  async addTemperatureLog(
    @Param('id') id: string,
    @Body('temperature') temperature: number,
    @Body('location') location?: string
  ) {
    const dispatch = await this.dispatchService.addTemperatureLog(id, temperature, location);
    if (!dispatch) {
      throw new Error('Dispatch not found');
    }
    return dispatch;
  }

  /**
   * 배송 완료 처리
   */
  @Put(':id/confirm-delivery')
  async confirmDelivery(
    @Param('id') id: string,
    @Body('receiverName') receiverName: string,
    @Body('receiverSignature') receiverSignature?: string,
    @Body('notes') notes?: string
  ) {
    const dispatch = await this.dispatchService.confirmDelivery(id, {
      receiverName,
      receiverSignature,
      notes,
    });
    if (!dispatch) {
      throw new Error('Dispatch not found');
    }
    return dispatch;
  }

  /**
   * 배송 실패 처리
   */
  @Put(':id/mark-failed')
  async markAsFailed(
    @Param('id') id: string,
    @Body('reason') reason: string
  ) {
    const dispatch = await this.dispatchService.markAsFailed(id, reason);
    if (!dispatch) {
      throw new Error('Dispatch not found');
    }
    return dispatch;
  }

  /**
   * 출고 시작 (준비 완료 → 출고)
   */
  @Put(':id/dispatch')
  async startDispatch(
    @Param('id') id: string,
    @Body('carrierName') carrierName?: string,
    @Body('trackingNumber') trackingNumber?: string,
    @Body('driverInfo') driverInfo?: {
      name?: string;
      phone?: string;
      vehicleNumber?: string;
    }
  ) {
    const dispatch = await this.dispatchService.update(id, {
      status: 'dispatched' as PharmaDispatchStatus,
      carrierName,
      trackingNumber,
      driverInfo,
      dispatchedAt: new Date(),
    });
    if (!dispatch) {
      throw new Error('Dispatch not found');
    }
    return dispatch;
  }
}
