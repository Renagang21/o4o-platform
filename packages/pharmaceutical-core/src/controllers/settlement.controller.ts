/**
 * Pharma Settlement Controller
 *
 * API: /api/v1/pharma/settlement
 *
 * PharmaSettlementBatch CRUD operations
 * 의약품 정산 관리 - 공급자(SUPPLIER)만 정산 대상
 *
 * @package @o4o/pharmaceutical-core
 */

import { Controller, Get, Post, Put, Req, Body, Param, Query } from '@nestjs/common';
import {
  PharmaSettlementService,
  type CreateSettlementBatchDto,
  type SettlementBatchFilter,
} from '../services/PharmaSettlementService.js';
import { PharmaSettlementStatus, PharmaSettlementType } from '../entities/PharmaSettlementBatch.entity.js';

@Controller('api/v1/pharma/settlement')
export class SettlementController {
  constructor(private readonly settlementService: PharmaSettlementService) {}

  /**
   * 정산 배치 목록 조회
   */
  @Get('batches')
  async getBatches(
    @Req() req: any,
    @Query('status') status?: PharmaSettlementStatus,
    @Query('settlementType') settlementType?: PharmaSettlementType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const targetId = req.user?.supplierId || req.query.targetId;

    const filter: SettlementBatchFilter = {
      targetId,
      status,
      settlementType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    };

    return await this.settlementService.findAll(filter);
  }

  /**
   * 정산 배치 상세 조회
   */
  @Get('batches/:id')
  async getBatch(@Param('id') id: string) {
    const batch = await this.settlementService.findById(id);
    if (!batch) {
      throw new Error('Settlement batch not found');
    }
    return batch;
  }

  /**
   * 배치번호로 정산 배치 조회
   */
  @Get('batches/by-number/:batchNumber')
  async getBatchByNumber(@Param('batchNumber') batchNumber: string) {
    const batch = await this.settlementService.findByBatchNumber(batchNumber);
    if (!batch) {
      throw new Error('Settlement batch not found');
    }
    return batch;
  }

  /**
   * 정산 통계 조회 (공급자용)
   */
  @Get('stats/:targetId')
  async getStats(
    @Param('targetId') targetId: string,
    @Query('settlementType') settlementType?: PharmaSettlementType
  ) {
    return await this.settlementService.getStats(
      targetId,
      settlementType || PharmaSettlementType.SUPPLIER
    );
  }

  /**
   * 공급자별 정산 배치 목록 조회
   */
  @Get('supplier/:supplierId')
  async getBatchesBySupplier(
    @Param('supplierId') supplierId: string,
    @Query('status') status?: PharmaSettlementStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return await this.settlementService.findAll({
      targetId: supplierId,
      settlementType: PharmaSettlementType.SUPPLIER,
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  /**
   * 약국별 정산 배치 목록 조회
   */
  @Get('pharmacy/:pharmacyId')
  async getBatchesByPharmacy(
    @Param('pharmacyId') pharmacyId: string,
    @Query('status') status?: PharmaSettlementStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return await this.settlementService.findAll({
      targetId: pharmacyId,
      settlementType: PharmaSettlementType.PHARMACY,
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  /**
   * 정산 배치 생성
   */
  @Post('batches')
  async createBatch(@Body() dto: CreateSettlementBatchDto) {
    if (!dto.targetId) {
      throw new Error('Target ID is required for settlement');
    }

    // 의약품은 공급자 정산만 가능 (SUPPLIER 타입 강제)
    if (dto.settlementType !== PharmaSettlementType.SUPPLIER) {
      throw new Error('Pharmaceutical settlement is only available for suppliers (SUPPLIER type)');
    }

    return await this.settlementService.createBatch(dto);
  }

  /**
   * 정산 배치 마감 (OPEN → CLOSED)
   */
  @Put('batches/:id/close')
  async closeBatch(@Param('id') id: string) {
    const batch = await this.settlementService.closeBatch(id);
    if (!batch) {
      throw new Error('Settlement batch not found');
    }
    return batch;
  }

  /**
   * 결제 완료 처리 (CLOSED → PAID)
   */
  @Put('batches/:id/pay')
  async markAsPaid(
    @Param('id') id: string,
    @Body('method') method?: string,
    @Body('accountNumber') accountNumber?: string,
    @Body('bankName') bankName?: string,
    @Body('reference') reference?: string
  ) {
    const batch = await this.settlementService.markAsPaid(id, {
      method,
      accountNumber,
      bankName,
      reference,
    });
    if (!batch) {
      throw new Error('Settlement batch not found');
    }
    return batch;
  }
}
