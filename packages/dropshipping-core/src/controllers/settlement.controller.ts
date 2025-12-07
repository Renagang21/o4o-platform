/**
 * Settlement Controller
 *
 * API: /api/v1/dropshipping/core/settlement
 */

import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { SettlementService } from '../services/SettlementService.js';
import { SettlementBatch, SettlementStatus } from '../entities/SettlementBatch.entity.js';

@Controller('api/v1/dropshipping/core/settlement')
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  @Get('batches')
  async findAllBatches(
    @Query('status') status?: SettlementStatus
  ): Promise<SettlementBatch[]> {
    return await this.settlementService.findAll({ status });
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
    @Body('periodStart') periodStart: string,
    @Body('periodEnd') periodEnd: string
  ): Promise<SettlementBatch> {
    return await this.settlementService.createSettlementBatch(
      new Date(periodStart),
      new Date(periodEnd)
    );
  }

  @Post('batches/:id/process')
  async processBatch(@Param('id') id: string): Promise<SettlementBatch> {
    return await this.settlementService.processSettlement(id);
  }
}
