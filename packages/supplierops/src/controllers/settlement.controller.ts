/**
 * Settlement Controller
 *
 * API: /api/v1/supplierops/settlement
 */

import { Controller, Get, Req, Param } from '@nestjs/common';
import { SettlementOpsService } from '../services/SettlementOpsService.js';
import type { SettlementSummaryDto, SettlementBatchDto } from '../dto/index.js';

@Controller('api/v1/supplierops/settlement')
export class SettlementController {
  constructor(private readonly settlementService: SettlementOpsService) {}

  @Get('summary')
  async getSummary(@Req() req: any): Promise<SettlementSummaryDto> {
    const supplierId = req.user?.supplierId || req.query.supplierId;
    if (!supplierId) {
      throw new Error('Supplier ID is required');
    }
    return await this.settlementService.getSettlementSummary(supplierId);
  }

  @Get('batches')
  async getBatches(@Req() req: any): Promise<SettlementBatchDto[]> {
    const supplierId = req.user?.supplierId || req.query.supplierId;
    if (!supplierId) {
      throw new Error('Supplier ID is required');
    }
    const batches = await this.settlementService.getSettlementBatches(supplierId);
    return batches.map((b) => ({
      id: b.id,
      periodStart: b.periodStart,
      periodEnd: b.periodEnd,
      totalAmount: b.totalAmount,
      commissionAmount: b.commissionAmount,
      netAmount: b.netAmount,
      status: b.status,
      transactionCount: b.transactionCount,
    }));
  }

  @Get('batches/:id/transactions')
  async getTransactions(@Param('id') batchId: string) {
    return await this.settlementService.getCommissionTransactions(batchId);
  }
}
