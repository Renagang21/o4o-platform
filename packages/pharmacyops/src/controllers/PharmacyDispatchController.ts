/**
 * PharmacyDispatchController
 *
 * 약국 배송 조회 API
 *
 * @package @o4o/pharmacyops
 */

import { Controller, Get, Post, Body, Query, Param, Req, UseGuards } from '@nestjs/common';
import { PharmacyDispatchService } from '../services/PharmacyDispatchService.js';
import { PharmacyAuthGuard, getPharmacyId } from '../guards/PharmacyAuthGuard.js';
import type { DispatchStatus } from '../dto/index.js';

@Controller('pharmacyops/dispatch')
@UseGuards(PharmacyAuthGuard)
export class PharmacyDispatchController {
  constructor(private readonly dispatchService: PharmacyDispatchService) {}

  /**
   * GET /api/v1/pharmacyops/dispatch
   * 배송 목록 조회
   */
  @Get()
  async list(
    @Req() req: any,
    @Query('status') status?: DispatchStatus,
    @Query('orderId') orderId?: string,
    @Query('requiresColdChain') requiresColdChain?: string,
    @Query('isNarcotics') isNarcotics?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    const pharmacyId = getPharmacyId(req);
    return this.dispatchService.list(pharmacyId, {
      status,
      orderId,
      requiresColdChain: requiresColdChain === 'true' ? true : requiresColdChain === 'false' ? false : undefined,
      isNarcotics: isNarcotics === 'true' ? true : isNarcotics === 'false' ? false : undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      sortBy,
      sortOrder,
    });
  }

  /**
   * GET /api/v1/pharmacyops/dispatch/active
   * 배송 중인 항목 조회
   */
  @Get('active')
  async getActiveDispatches(@Req() req: any) {
    const pharmacyId = getPharmacyId(req);
    return this.dispatchService.getActiveDispatches(pharmacyId);
  }

  /**
   * GET /api/v1/pharmacyops/dispatch/today
   * 오늘 도착 예정 배송 조회
   */
  @Get('today')
  async getTodayDeliveries(@Req() req: any) {
    const pharmacyId = getPharmacyId(req);
    return this.dispatchService.getTodayDeliveries(pharmacyId);
  }

  /**
   * GET /api/v1/pharmacyops/dispatch/cold-chain
   * 콜드체인 배송 조회
   */
  @Get('cold-chain')
  async getColdChainDispatches(@Req() req: any) {
    const pharmacyId = getPharmacyId(req);
    return this.dispatchService.getColdChainDispatches(pharmacyId);
  }

  /**
   * GET /api/v1/pharmacyops/dispatch/narcotics
   * 마약류 배송 조회
   */
  @Get('narcotics')
  async getNarcoticsDispatches(@Req() req: any) {
    const pharmacyId = getPharmacyId(req);
    return this.dispatchService.getNarcoticsDispatches(pharmacyId);
  }

  /**
   * GET /api/v1/pharmacyops/dispatch/failed
   * 배송 실패 목록 조회
   */
  @Get('failed')
  async getFailedDispatches(@Req() req: any) {
    const pharmacyId = getPharmacyId(req);
    return this.dispatchService.getFailedDispatches(pharmacyId);
  }

  /**
   * GET /api/v1/pharmacyops/dispatch/:id
   * 배송 상세 조회
   */
  @Get(':id')
  async detail(@Req() req: any, @Param('id') id: string) {
    const pharmacyId = getPharmacyId(req);
    const dispatch = await this.dispatchService.detail(pharmacyId, id);
    if (!dispatch) {
      throw new Error('Dispatch not found');
    }
    return dispatch;
  }

  /**
   * GET /api/v1/pharmacyops/dispatch/order/:orderId
   * 주문별 배송 조회
   */
  @Get('order/:orderId')
  async findByOrder(@Req() req: any, @Param('orderId') orderId: string) {
    const pharmacyId = getPharmacyId(req);
    const dispatch = await this.dispatchService.findByOrder(pharmacyId, orderId);
    if (!dispatch) {
      throw new Error('Dispatch not found');
    }
    return dispatch;
  }

  /**
   * GET /api/v1/pharmacyops/dispatch/tracking/:trackingNumber
   * 운송장 번호로 조회
   */
  @Get('tracking/:trackingNumber')
  async findByTrackingNumber(
    @Req() req: any,
    @Param('trackingNumber') trackingNumber: string,
  ) {
    const pharmacyId = getPharmacyId(req);
    const dispatch = await this.dispatchService.findByTrackingNumber(
      pharmacyId,
      trackingNumber,
    );
    if (!dispatch) {
      throw new Error('Dispatch not found');
    }
    return dispatch;
  }

  /**
   * GET /api/v1/pharmacyops/dispatch/:id/temperature-logs
   * 온도 로그 조회
   */
  @Get(':id/temperature-logs')
  async getTemperatureLogs(@Req() req: any, @Param('id') id: string) {
    const pharmacyId = getPharmacyId(req);
    return this.dispatchService.getTemperatureLogs(pharmacyId, id);
  }

  /**
   * POST /api/v1/pharmacyops/dispatch/:id/confirm
   * 배송 수령 확인
   */
  @Post(':id/confirm')
  async confirmDelivery(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: {
      receiverName: string;
      receiverSignature?: string;
      notes?: string;
    },
  ) {
    const pharmacyId = getPharmacyId(req);
    return this.dispatchService.confirmDelivery(pharmacyId, id, body);
  }
}
