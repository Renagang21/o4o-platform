/**
 * Settlement Operations Service
 *
 * Phase 9-B: Core 정렬 업데이트
 * - Core SettlementType, SettlementBatchStatus enum 사용
 * - productType 기반 정산 분류 지원
 * - contextType = 'supplier' 정산 흐름
 */

import { SettlementType, SettlementBatchStatus, ProductType } from '@o4o/dropshipping-core';

export interface SettlementBatch {
  id: string;
  batchNumber: string;
  periodStart: Date;
  periodEnd: Date;
  totalAmount: number;
  commissionAmount: number;
  deductionAmount: number;
  netAmount: number;
  status: SettlementBatchStatus;
  settlementType: SettlementType;
  transactionCount: number;
  closedAt?: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommissionTransaction {
  id: string;
  orderId: string;
  orderNumber: string;
  orderRelayId?: string;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
  productType?: ProductType;
  createdAt: Date;
}

export interface SettlementSummary {
  totalSettled: number;
  pendingSettlement: number;
  currentPeriodSales: number;
  currentPeriodCommission: number;
  deductionAmount: number;
  netAmount: number;
}

export interface SettlementFilterOptions {
  status?: SettlementBatchStatus;
  productType?: ProductType;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export class SettlementOpsService {
  /**
   * Get settlement summary for a supplier
   */
  async getSettlementSummary(supplierId: string): Promise<SettlementSummary> {
    return {
      totalSettled: 25000000,
      pendingSettlement: 3500000,
      currentPeriodSales: 8750000,
      currentPeriodCommission: 875000,
      deductionAmount: 0,
      netAmount: 7875000,
    };
  }

  /**
   * Get settlement batches for a supplier (필터링 지원)
   */
  async getSettlementBatches(supplierId: string, options?: SettlementFilterOptions): Promise<SettlementBatch[]> {
    // Demo data (Core 스펙에 맞게 업데이트)
    const demoBatches: SettlementBatch[] = [
      {
        id: '1',
        batchNumber: 'STL-2024-12',
        periodStart: new Date(2024, 11, 1),
        periodEnd: new Date(2024, 11, 31),
        totalAmount: 8750000,
        commissionAmount: 875000,
        deductionAmount: 0,
        netAmount: 7875000,
        status: SettlementBatchStatus.OPEN,
        settlementType: SettlementType.SUPPLIER,
        transactionCount: 58,
        createdAt: new Date(2024, 11, 1),
        updatedAt: new Date(),
      },
      {
        id: '2',
        batchNumber: 'STL-2024-11',
        periodStart: new Date(2024, 10, 1),
        periodEnd: new Date(2024, 10, 30),
        totalAmount: 7200000,
        commissionAmount: 720000,
        deductionAmount: 0,
        netAmount: 6480000,
        status: SettlementBatchStatus.CLOSED,
        settlementType: SettlementType.SUPPLIER,
        transactionCount: 45,
        closedAt: new Date(2024, 11, 5),
        createdAt: new Date(2024, 10, 1),
        updatedAt: new Date(2024, 11, 5),
      },
      {
        id: '3',
        batchNumber: 'STL-2024-10',
        periodStart: new Date(2024, 9, 1),
        periodEnd: new Date(2024, 9, 31),
        totalAmount: 9100000,
        commissionAmount: 910000,
        deductionAmount: 0,
        netAmount: 8190000,
        status: SettlementBatchStatus.PAID,
        settlementType: SettlementType.SUPPLIER,
        transactionCount: 62,
        closedAt: new Date(2024, 10, 5),
        paidAt: new Date(2024, 10, 15),
        createdAt: new Date(2024, 9, 1),
        updatedAt: new Date(2024, 10, 15),
      },
    ];

    // 필터링 적용
    let filtered = demoBatches;
    if (options?.status) {
      filtered = filtered.filter(b => b.status === options.status);
    }
    if (options?.startDate) {
      filtered = filtered.filter(b => b.periodStart >= options.startDate!);
    }
    if (options?.endDate) {
      filtered = filtered.filter(b => b.periodEnd <= options.endDate!);
    }

    return filtered;
  }

  /**
   * Get commission transactions for a batch (productType 필터링 지원)
   */
  async getCommissionTransactions(
    batchId: string,
    productType?: ProductType
  ): Promise<CommissionTransaction[]> {
    const demoTransactions: CommissionTransaction[] = [
      {
        id: '1',
        orderId: 'order-1',
        orderNumber: 'ORD-001',
        orderRelayId: 'relay-1',
        orderAmount: 64000,
        commissionRate: 10,
        commissionAmount: 6400,
        netAmount: 57600,
        productType: ProductType.COSMETICS,
        createdAt: new Date(),
      },
      {
        id: '2',
        orderId: 'order-2',
        orderNumber: 'ORD-002',
        orderRelayId: 'relay-2',
        orderAmount: 75000,
        commissionRate: 10,
        commissionAmount: 7500,
        netAmount: 67500,
        productType: ProductType.COSMETICS,
        createdAt: new Date(Date.now() - 86400000),
      },
      {
        id: '3',
        orderId: 'order-3',
        orderNumber: 'ORD-003',
        orderRelayId: 'relay-3',
        orderAmount: 120000,
        commissionRate: 8,
        commissionAmount: 9600,
        netAmount: 110400,
        productType: ProductType.GENERAL,
        createdAt: new Date(Date.now() - 172800000),
      },
    ];

    // productType 필터링
    if (productType) {
      return demoTransactions.filter(t => t.productType === productType);
    }

    return demoTransactions;
  }

  /**
   * productType별 정산 통계 조회
   */
  async getSettlementByProductType(supplierId: string): Promise<Record<ProductType, {
    totalAmount: number;
    commissionAmount: number;
    netAmount: number;
    transactionCount: number;
  }>> {
    return {
      [ProductType.COSMETICS]: {
        totalAmount: 5000000,
        commissionAmount: 500000,
        netAmount: 4500000,
        transactionCount: 35,
      },
      [ProductType.GENERAL]: {
        totalAmount: 3750000,
        commissionAmount: 375000,
        netAmount: 3375000,
        transactionCount: 23,
      },
      [ProductType.FOOD]: {
        totalAmount: 0,
        commissionAmount: 0,
        netAmount: 0,
        transactionCount: 0,
      },
      [ProductType.HEALTH]: {
        totalAmount: 0,
        commissionAmount: 0,
        netAmount: 0,
        transactionCount: 0,
      },
      [ProductType.ELECTRONICS]: {
        totalAmount: 0,
        commissionAmount: 0,
        netAmount: 0,
        transactionCount: 0,
      },
      [ProductType.PHARMACEUTICAL]: {
        totalAmount: 0,
        commissionAmount: 0,
        netAmount: 0,
        transactionCount: 0,
      },
      [ProductType.CUSTOM]: {
        totalAmount: 0,
        commissionAmount: 0,
        netAmount: 0,
        transactionCount: 0,
      },
    };
  }

  /**
   * 정산 배치 마감 요청
   */
  async requestBatchClose(batchId: string): Promise<void> {
    // 실제 구현에서는 DB 업데이트 및 Core Hook 호출
    console.log(`[SettlementOpsService] Batch ${batchId} close requested`);
  }

  /**
   * 정산 내역 다운로드 데이터 생성
   */
  async generateSettlementReport(batchId: string): Promise<{
    batch: SettlementBatch;
    transactions: CommissionTransaction[];
    summary: SettlementSummary;
  }> {
    const batches = await this.getSettlementBatches('', { status: undefined });
    const batch = batches.find(b => b.id === batchId) || batches[0];
    const transactions = await this.getCommissionTransactions(batchId);
    const summary = await this.getSettlementSummary('');

    return { batch, transactions, summary };
  }
}
