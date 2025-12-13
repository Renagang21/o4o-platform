/**
 * PharmacySettlementService
 *
 * 약국 정산(구매 내역) 서비스
 * pharmaceutical-core의 PharmaSettlement를 래핑
 * 약국은 구매자이므로 expense 관점
 *
 * @package @o4o/pharmacyops
 */

import { Injectable } from '@nestjs/common';
import type {
  PharmacySettlementDto,
  PharmacySettlementListItemDto,
  PharmacySettlementSummaryDto,
  SettlementStatus,
} from '../dto/index.js';

export interface SettlementSearchParams {
  status?: SettlementStatus;
  supplierId?: string;
  periodStart?: Date;
  periodEnd?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface SettlementSearchResult {
  items: PharmacySettlementListItemDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class PharmacySettlementService {
  /**
   * 정산 목록 조회 (약국 기준 - 지출 내역)
   */
  async list(
    pharmacyId: string,
    params: SettlementSearchParams,
  ): Promise<SettlementSearchResult> {
    const { page = 1, limit = 20 } = params;

    // TODO: Implement with pharmaceutical-core PharmaSettlementService
    // - pharmacyId 필터 적용
    // - expense 관점으로 데이터 변환

    return {
      items: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    };
  }

  /**
   * 정산 상세 조회
   */
  async detail(
    pharmacyId: string,
    settlementId: string,
  ): Promise<PharmacySettlementDto | null> {
    // TODO: Implement with pharmaceutical-core
    // - 약국 소유권 검증
    return null;
  }

  /**
   * 정산 요약 조회
   */
  async getSummary(pharmacyId: string): Promise<PharmacySettlementSummaryDto> {
    // TODO: Implement summary calculation
    return {
      pharmacyId,
      totalBatches: 0,
      totalPaidAmount: 0,
      totalPendingAmount: 0,
      thisMonthPurchaseAmount: 0,
      thisMonthOrderCount: 0,
      pendingBatches: 0,
      pendingAmount: 0,
    };
  }

  /**
   * 미결제 정산 조회
   */
  async getPendingSettlements(
    pharmacyId: string,
  ): Promise<PharmacySettlementListItemDto[]> {
    const result = await this.list(pharmacyId, {
      status: 'pending_payment',
      limit: 100,
      sortBy: 'paymentDueDate',
      sortOrder: 'ASC',
    });
    return result.items;
  }

  /**
   * 공급자별 정산 조회
   */
  async listBySupplier(
    pharmacyId: string,
    supplierId: string,
    params?: SettlementSearchParams,
  ): Promise<SettlementSearchResult> {
    return this.list(pharmacyId, { ...params, supplierId });
  }

  /**
   * 기간별 구매 금액 조회
   */
  async getPurchaseAmountByPeriod(
    pharmacyId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<{
    totalAmount: number;
    orderCount: number;
    settlementCount: number;
  }> {
    // TODO: Implement period calculation
    return {
      totalAmount: 0,
      orderCount: 0,
      settlementCount: 0,
    };
  }

  /**
   * 월별 구매 내역 조회
   */
  async getMonthlyExpenses(
    pharmacyId: string,
    year: number,
  ): Promise<
    Array<{
      month: number;
      totalAmount: number;
      orderCount: number;
      paidAmount: number;
      pendingAmount: number;
    }>
  > {
    // TODO: Implement monthly expenses
    return Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      totalAmount: 0,
      orderCount: 0,
      paidAmount: 0,
      pendingAmount: 0,
    }));
  }

  /**
   * 공급자별 구매 통계
   */
  async getSupplierPurchaseStats(
    pharmacyId: string,
  ): Promise<
    Array<{
      supplierId: string;
      supplierName: string;
      totalAmount: number;
      orderCount: number;
      lastOrderDate?: Date;
    }>
  > {
    // TODO: Implement supplier stats
    return [];
  }

  /**
   * 다음 결제 예정일 조회
   */
  async getNextPaymentDueDate(pharmacyId: string): Promise<Date | null> {
    const pending = await this.getPendingSettlements(pharmacyId);
    if (pending.length === 0) {
      return null;
    }
    return pending[0].dueDate || null;
  }

  /**
   * 결제 만료 임박 정산 조회
   */
  async getDueSoonSettlements(
    pharmacyId: string,
    withinDays: number = 7,
  ): Promise<PharmacySettlementListItemDto[]> {
    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + withinDays);

    const pending = await this.getPendingSettlements(pharmacyId);
    return pending.filter(
      (s) => s.dueDate && new Date(s.dueDate) <= dueDate,
    );
  }

  /**
   * 정산 내역 PDF 다운로드 URL 생성
   */
  async generateStatementPdfUrl(
    pharmacyId: string,
    settlementId: string,
  ): Promise<string | null> {
    // TODO: Implement PDF generation
    return null;
  }

  /**
   * 정산 내역 Excel 다운로드 URL 생성
   */
  async generateStatementExcelUrl(
    pharmacyId: string,
    params: SettlementSearchParams,
  ): Promise<string | null> {
    // TODO: Implement Excel generation
    return null;
  }
}
