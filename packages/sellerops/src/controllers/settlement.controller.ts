/**
 * Settlement Controller
 *
 * API: /api/v1/sellerops/settlement
 */

import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { SettlementOpsService } from '../services/SettlementOpsService.js';
import type {
  SettlementSummaryDto,
  SettlementBatchDto,
  CommissionDetailDto,
} from '../dto/index.js';

@Controller('api/v1/sellerops/settlement')
export class SettlementController {
  constructor(private readonly settlementOpsService: SettlementOpsService) {}

  @Get('summary')
  async getSummary(@Req() req: any): Promise<SettlementSummaryDto> {
    const sellerId = req.user?.sellerId || req.query.sellerId;
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }
    return await this.settlementOpsService.getSettlementSummary(sellerId);
  }

  @Get('batches')
  async getBatches(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('year') year?: string,
    @Query('month') month?: string
  ): Promise<SettlementBatchDto[]> {
    const sellerId = req.user?.sellerId || req.query.sellerId;
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }

    const filters: any = {};
    if (status) filters.status = status;
    if (year) filters.year = parseInt(year);
    if (month) filters.month = parseInt(month);

    return await this.settlementOpsService.getSettlementBatches(
      sellerId,
      filters
    );
  }

  @Get('batches/:id')
  async getBatch(
    @Param('id') id: string,
    @Req() req: any
  ): Promise<SettlementBatchDto> {
    const sellerId = req.user?.sellerId || req.query.sellerId;
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }

    const batch = await this.settlementOpsService.getSettlementBatchById(
      id,
      sellerId
    );
    if (!batch) {
      throw new Error('Settlement batch not found');
    }
    return batch;
  }

  @Get('commissions')
  async getCommissions(
    @Req() req: any,
    @Query('batchId') batchId?: string
  ): Promise<CommissionDetailDto[]> {
    const sellerId = req.user?.sellerId || req.query.sellerId;
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }
    return await this.settlementOpsService.getCommissionDetails(
      sellerId,
      batchId
    );
  }
}
