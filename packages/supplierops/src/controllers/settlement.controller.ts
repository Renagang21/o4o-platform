/**
 * Settlement Controller
 *
 * API: /api/v1/supplierops/settlement
 *
 * Phase 9-B: Core 정렬 업데이트
 * - SettlementBatchStatus enum 정렬
 * - SettlementType = SUPPLIER 정합성
 * - productType별 정산 통계 지원
 */

import { Controller, Get, Post, Req, Param, Query } from '@nestjs/common';
import { SettlementOpsService, SettlementFilterOptions } from '../services/SettlementOpsService.js';
import type {
  SettlementSummaryDto,
  SettlementBatchDto,
  CommissionTransactionDto,
  ProductType
} from '../dto/index.js';
import { SettlementBatchStatus, SettlementType } from '@o4o/dropshipping-core';

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
  async getBatches(
    @Req() req: any,
    @Query('status') status?: SettlementBatchStatus
  ): Promise<SettlementBatchDto[]> {
    const supplierId = req.user?.supplierId || req.query.supplierId;
    if (!supplierId) {
      throw new Error('Supplier ID is required');
    }

    const filterOptions: SettlementFilterOptions = { status };
    const batches = await this.settlementService.getSettlementBatches(supplierId, filterOptions);

    return batches.map((b) => ({
      id: b.id,
      batchNumber: b.batchNumber,
      periodStart: b.periodStart,
      periodEnd: b.periodEnd,
      totalAmount: b.totalAmount,
      commissionAmount: b.commissionAmount,
      deductionAmount: b.deductionAmount,
      netAmount: b.netAmount,
      status: b.status as string,
      settlementType: b.settlementType,
      transactionCount: b.transactionCount,
      closedAt: b.closedAt,
      paidAt: b.paidAt,
    }));
  }

  @Get('batches/:id')
  async getBatchDetail(@Param('id') batchId: string): Promise<SettlementBatchDto | null> {
    const batches = await this.settlementService.getSettlementBatches('');
    const batch = batches.find(b => b.id === batchId);

    if (!batch) {
      return null;
    }

    return {
      id: batch.id,
      batchNumber: batch.batchNumber,
      periodStart: batch.periodStart,
      periodEnd: batch.periodEnd,
      totalAmount: batch.totalAmount,
      commissionAmount: batch.commissionAmount,
      deductionAmount: batch.deductionAmount,
      netAmount: batch.netAmount,
      status: batch.status as string,
      settlementType: batch.settlementType,
      transactionCount: batch.transactionCount,
      closedAt: batch.closedAt,
      paidAt: batch.paidAt,
    };
  }

  @Get('batches/:id/transactions')
  async getTransactions(
    @Param('id') batchId: string,
    @Query('productType') productType?: ProductType
  ): Promise<CommissionTransactionDto[]> {
    const transactions = await this.settlementService.getCommissionTransactions(batchId, productType);
    return transactions.map((t) => ({
      id: t.id,
      orderId: t.orderId,
      orderNumber: t.orderNumber,
      orderAmount: t.orderAmount,
      commissionRate: t.commissionRate,
      commissionAmount: t.commissionAmount,
      netAmount: t.netAmount,
      productType: t.productType,
      createdAt: t.createdAt,
    }));
  }

  @Get('by-product-type')
  async getSettlementByProductType(@Req() req: any): Promise<Record<string, {
    totalAmount: number;
    commissionAmount: number;
    netAmount: number;
    transactionCount: number;
  }>> {
    const supplierId = req.user?.supplierId || req.query.supplierId;
    if (!supplierId) {
      throw new Error('Supplier ID is required');
    }
    return await this.settlementService.getSettlementByProductType(supplierId);
  }

  @Post('batches/:id/close-request')
  async requestBatchClose(@Param('id') batchId: string): Promise<{ success: boolean; message: string }> {
    await this.settlementService.requestBatchClose(batchId);
    return { success: true, message: '정산 마감 요청이 접수되었습니다.' };
  }

  @Get('batches/:id/report')
  async getSettlementReport(@Param('id') batchId: string): Promise<{
    batch: SettlementBatchDto;
    transactions: CommissionTransactionDto[];
    summary: SettlementSummaryDto;
  }> {
    const report = await this.settlementService.generateSettlementReport(batchId);
    return {
      batch: {
        id: report.batch.id,
        batchNumber: report.batch.batchNumber,
        periodStart: report.batch.periodStart,
        periodEnd: report.batch.periodEnd,
        totalAmount: report.batch.totalAmount,
        commissionAmount: report.batch.commissionAmount,
        deductionAmount: report.batch.deductionAmount,
        netAmount: report.batch.netAmount,
        status: report.batch.status as string,
        settlementType: report.batch.settlementType,
        transactionCount: report.batch.transactionCount,
        closedAt: report.batch.closedAt,
        paidAt: report.batch.paidAt,
      },
      transactions: report.transactions.map((t) => ({
        id: t.id,
        orderId: t.orderId,
        orderNumber: t.orderNumber,
        orderAmount: t.orderAmount,
        commissionRate: t.commissionRate,
        commissionAmount: t.commissionAmount,
        netAmount: t.netAmount,
        productType: t.productType,
        createdAt: t.createdAt,
      })),
      summary: report.summary,
    };
  }
}
