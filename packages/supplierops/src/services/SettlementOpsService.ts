/**
 * Settlement Operations Service
 *
 * Manages settlement and commission data for Supplier
 */

export interface SettlementBatch {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  totalAmount: number;
  commissionAmount: number;
  netAmount: number;
  status: 'open' | 'closed' | 'paid';
  transactionCount: number;
}

export interface CommissionTransaction {
  id: string;
  orderId: string;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
  createdAt: Date;
}

export class SettlementOpsService {
  /**
   * Get settlement summary for a supplier
   */
  async getSettlementSummary(supplierId: string): Promise<{
    totalSettled: number;
    pendingSettlement: number;
    currentPeriodSales: number;
    currentPeriodCommission: number;
  }> {
    return {
      totalSettled: 25000000,
      pendingSettlement: 3500000,
      currentPeriodSales: 8750000,
      currentPeriodCommission: 875000,
    };
  }

  /**
   * Get settlement batches for a supplier
   */
  async getSettlementBatches(supplierId: string): Promise<SettlementBatch[]> {
    // Demo data
    return [
      {
        id: '1',
        periodStart: new Date(2024, 11, 1),
        periodEnd: new Date(2024, 11, 31),
        totalAmount: 8750000,
        commissionAmount: 875000,
        netAmount: 7875000,
        status: 'open',
        transactionCount: 58,
      },
      {
        id: '2',
        periodStart: new Date(2024, 10, 1),
        periodEnd: new Date(2024, 10, 30),
        totalAmount: 7200000,
        commissionAmount: 720000,
        netAmount: 6480000,
        status: 'closed',
        transactionCount: 45,
      },
      {
        id: '3',
        periodStart: new Date(2024, 9, 1),
        periodEnd: new Date(2024, 9, 31),
        totalAmount: 9100000,
        commissionAmount: 910000,
        netAmount: 8190000,
        status: 'paid',
        transactionCount: 62,
      },
    ];
  }

  /**
   * Get commission transactions for a batch
   */
  async getCommissionTransactions(
    batchId: string
  ): Promise<CommissionTransaction[]> {
    return [
      {
        id: '1',
        orderId: 'ORD-001',
        orderAmount: 64000,
        commissionRate: 10,
        commissionAmount: 6400,
        netAmount: 57600,
        createdAt: new Date(),
      },
      {
        id: '2',
        orderId: 'ORD-002',
        orderAmount: 75000,
        commissionRate: 10,
        commissionAmount: 7500,
        netAmount: 67500,
        createdAt: new Date(Date.now() - 86400000),
      },
    ];
  }
}
