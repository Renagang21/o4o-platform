/**
 * Settlement Controller
 *
 * API: /api/v1/dropshipping/core/settlement
 */

import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { SettlementService } from '../services/SettlementService.js';
import { SettlementBatch, SettlementBatchStatus, SettlementType } from '../entities/SettlementBatch.entity.js';

@Controller('api/v1/dropshipping/core/settlement')
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  @Get('batches')
  async findAllBatches(
    @Query('status') status?: SettlementBatchStatus,
    @Query('settlementType') settlementType?: SettlementType,
    @Query('sellerId') sellerId?: string,
    @Query('supplierId') supplierId?: string
  ): Promise<SettlementBatch[]> {
    return await this.settlementService.findAll({ status, settlementType, sellerId, supplierId });
  }

  @Get('batches/:id')
  async findBatch(@Param('id') id: string): Promise<SettlementBatch> {
    const batch = await this.settlementService.findById(id);
    if (!batch) {
      throw new Error('Settlement batch not found');
    }
    return batch;
  }

  @Post('batches')
  async createBatch(
    @Body('sellerId') sellerId: string,
    @Body('periodStart') periodStart: string,
    @Body('periodEnd') periodEnd: string
  ): Promise<SettlementBatch> {
    return await this.settlementService.createSettlementBatch(
      sellerId,
      new Date(periodStart),
      new Date(periodEnd)
    );
  }

  @Post('batches/:id/close')
  async closeBatch(@Param('id') id: string): Promise<SettlementBatch> {
    return await this.settlementService.closeSettlement(id);
  }

  @Post('batches/:id/pay')
  async payBatch(@Param('id') id: string): Promise<SettlementBatch> {
    return await this.settlementService.paySettlement(id);
  }
}
