/**
 * PharmacySettlementController
 *
 * 약국 정산(구매 내역) API
 *
 * @package @o4o/pharmacyops
 */

import { Controller, Get, Query, Param, Req, UseGuards } from '@nestjs/common';
import { PharmacySettlementService } from '../services/PharmacySettlementService.js';
import { PharmacyAuthGuard, getPharmacyId } from '../guards/PharmacyAuthGuard.js';
import type { SettlementStatus } from '../dto/index.js';

@Controller('pharmacyops/settlement')
@UseGuards(PharmacyAuthGuard)
export class PharmacySettlementController {
  constructor(private readonly settlementService: PharmacySettlementService) {}

  /**
   * GET /api/v1/pharmacyops/settlement
   * 정산 목록 조회 (구매 내역)
   */
  @Get()
  async list(
    @Req() req: any,
    @Query('status') status?: SettlementStatus,
    @Query('supplierId') supplierId?: string,
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    const pharmacyId = getPharmacyId(req);
    return this.settlementService.list(pharmacyId, {
      status,
      supplierId,
      periodStart: periodStart ? new Date(periodStart) : undefined,
      periodEnd: periodEnd ? new Date(periodEnd) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      sortBy,
      sortOrder,
    });
  }

  /**
   * GET /api/v1/pharmacyops/settlement/summary
   * 정산 요약 조회
   */
  @Get('summary')
  async getSummary(@Req() req: any) {
    const pharmacyId = getPharmacyId(req);
    return this.settlementService.getSummary(pharmacyId);
  }

  /**
   * GET /api/v1/pharmacyops/settlement/pending
   * 미결제 정산 조회
   */
  @Get('pending')
  async getPendingSettlements(@Req() req: any) {
    const pharmacyId = getPharmacyId(req);
    return this.settlementService.getPendingSettlements(pharmacyId);
  }

  /**
   * GET /api/v1/pharmacyops/settlement/due-soon
   * 결제 만료 임박 정산 조회
   */
  @Get('due-soon')
  async getDueSoonSettlements(
    @Req() req: any,
    @Query('days') days?: string,
  ) {
    const pharmacyId = getPharmacyId(req);
    return this.settlementService.getDueSoonSettlements(
      pharmacyId,
      days ? parseInt(days) : 7,
    );
  }

  /**
   * GET /api/v1/pharmacyops/settlement/monthly
   * 월별 구매 내역 조회
   */
  @Get('monthly')
  async getMonthlyExpenses(
    @Req() req: any,
    @Query('year') year?: string,
  ) {
    const pharmacyId = getPharmacyId(req);
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    return this.settlementService.getMonthlyExpenses(pharmacyId, targetYear);
  }

  /**
   * GET /api/v1/pharmacyops/settlement/supplier-stats
   * 공급자별 구매 통계
   */
  @Get('supplier-stats')
  async getSupplierPurchaseStats(@Req() req: any) {
    const pharmacyId = getPharmacyId(req);
    return this.settlementService.getSupplierPurchaseStats(pharmacyId);
  }

  /**
   * GET /api/v1/pharmacyops/settlement/:id
   * 정산 상세 조회
   */
  @Get(':id')
  async detail(@Req() req: any, @Param('id') id: string) {
    const pharmacyId = getPharmacyId(req);
    const settlement = await this.settlementService.detail(pharmacyId, id);
    if (!settlement) {
      throw new Error('Settlement not found');
    }
    return settlement;
  }

  /**
   * GET /api/v1/pharmacyops/settlement/supplier/:supplierId
   * 공급자별 정산 조회
   */
  @Get('supplier/:supplierId')
  async listBySupplier(
    @Req() req: any,
    @Param('supplierId') supplierId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pharmacyId = getPharmacyId(req);
    return this.settlementService.listBySupplier(pharmacyId, supplierId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  /**
   * GET /api/v1/pharmacyops/settlement/:id/pdf
   * 정산 내역 PDF 다운로드 URL
   */
  @Get(':id/pdf')
  async generatePdf(@Req() req: any, @Param('id') id: string) {
    const pharmacyId = getPharmacyId(req);
    const url = await this.settlementService.generateStatementPdfUrl(pharmacyId, id);
    if (!url) {
      throw new Error('Failed to generate PDF');
    }
    return { url };
  }

  /**
   * GET /api/v1/pharmacyops/settlement/export/excel
   * 정산 내역 Excel 다운로드 URL
   */
  @Get('export/excel')
  async generateExcel(
    @Req() req: any,
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
    @Query('supplierId') supplierId?: string,
  ) {
    const pharmacyId = getPharmacyId(req);
    const url = await this.settlementService.generateStatementExcelUrl(pharmacyId, {
      periodStart: periodStart ? new Date(periodStart) : undefined,
      periodEnd: periodEnd ? new Date(periodEnd) : undefined,
      supplierId,
    });
    if (!url) {
      throw new Error('Failed to generate Excel');
    }
    return { url };
  }
}
