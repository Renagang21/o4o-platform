/**
 * Settlement Service
 *
 * 파트너 정산 관리 서비스
 */

import type { DataSource } from 'typeorm';

export interface SettlementBatch {
  id: string;
  partnerId: string;
  period: string; // 예: '2025-12'
  totalAmount: number;
  totalCommission: number;
  conversionCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paidAt?: Date;
  createdAt: Date;
}

export interface SettlementTransaction {
  id: string;
  batchId: string;
  conversionId: string;
  amount: number;
  commission: number;
  createdAt: Date;
}

export interface SettlementSummary {
  totalEarnings: number;
  paidEarnings: number;
  pendingEarnings: number;
  lastPaymentDate?: Date;
  nextPaymentDate?: Date;
}

export class SettlementService {
  constructor(private readonly dataSource?: DataSource) {}

  /**
   * 정산 요약 조회
   */
  async getSummary(tenantId: string, partnerId: string): Promise<SettlementSummary> {
    if (!this.dataSource) {
      return this.getEmptySummary();
    }

    try {
      // 총 수익 (확정된 전환)
      const earningsResult = await this.dataSource.query(
        `SELECT
           COALESCE(SUM(commission), 0) as total_earnings,
           COALESCE(SUM(CASE WHEN status = 'paid' THEN commission ELSE 0 END), 0) as paid_earnings,
           COALESCE(SUM(CASE WHEN status = 'confirmed' THEN commission ELSE 0 END), 0) as pending_earnings
         FROM partnerops_conversions
         WHERE partner_id = $1 AND tenant_id = $2 AND status IN ('confirmed', 'paid')`,
        [partnerId, tenantId]
      );

      const totalEarnings = parseFloat(earningsResult[0]?.total_earnings || '0');
      const paidEarnings = parseFloat(earningsResult[0]?.paid_earnings || '0');
      const pendingEarnings = parseFloat(earningsResult[0]?.pending_earnings || '0');

      // 마지막 지급일
      const lastPaymentResult = await this.dataSource.query(
        `SELECT MAX(paid_at) as last_payment FROM partnerops_settlement_batches
         WHERE partner_id = $1 AND tenant_id = $2 AND status = 'completed'`,
        [partnerId, tenantId]
      );
      const lastPaymentDate = lastPaymentResult[0]?.last_payment || undefined;

      // 다음 지급 예정일 (매월 15일로 가정)
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15);
      const thisMonth15 = new Date(now.getFullYear(), now.getMonth(), 15);
      const nextPaymentDate = now.getDate() < 15 ? thisMonth15 : nextMonth;

      return {
        totalEarnings,
        paidEarnings,
        pendingEarnings,
        lastPaymentDate,
        nextPaymentDate,
      };
    } catch (error) {
      console.error('SettlementService getSummary error:', error);
      return this.getEmptySummary();
    }
  }

  /**
   * 정산 배치 목록 조회
   */
  async getBatches(tenantId: string, partnerId: string, filters?: { status?: string }): Promise<SettlementBatch[]> {
    if (!this.dataSource) {
      return [];
    }

    try {
      let query = `
        SELECT id, partner_id as "partnerId", period,
               total_amount as "totalAmount", total_commission as "totalCommission",
               conversion_count as "conversionCount", status,
               paid_at as "paidAt", created_at as "createdAt"
        FROM partnerops_settlement_batches
        WHERE partner_id = $1 AND tenant_id = $2
      `;
      const params: any[] = [partnerId, tenantId];

      if (filters?.status) {
        query += ` AND status = $3`;
        params.push(filters.status);
      }

      query += ` ORDER BY created_at DESC`;

      return await this.dataSource.query(query, params);
    } catch (error) {
      console.error('SettlementService getBatches error:', error);
      return [];
    }
  }

  /**
   * 정산 트랜잭션 목록 조회
   */
  async getTransactions(tenantId: string, partnerId: string, batchId?: string): Promise<SettlementTransaction[]> {
    if (!this.dataSource) {
      return [];
    }

    try {
      let query = `
        SELECT t.id, t.batch_id as "batchId", t.conversion_id as "conversionId",
               t.amount, t.commission, t.created_at as "createdAt"
        FROM partnerops_settlement_transactions t
        JOIN partnerops_settlement_batches b ON t.batch_id = b.id
        WHERE b.partner_id = $1 AND b.tenant_id = $2
      `;
      const params: any[] = [partnerId, tenantId];

      if (batchId) {
        query += ` AND t.batch_id = $3`;
        params.push(batchId);
      }

      query += ` ORDER BY t.created_at DESC`;

      return await this.dataSource.query(query, params);
    } catch (error) {
      console.error('SettlementService getTransactions error:', error);
      return [];
    }
  }

  /**
   * 정산 배치 생성 (관리자용)
   */
  async createBatch(tenantId: string, partnerId: string, period: string): Promise<SettlementBatch> {
    if (!this.dataSource) {
      return this.createEmptyBatch(partnerId, period);
    }

    try {
      // 해당 기간의 확정된 전환 조회
      const [year, month] = period.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

      const conversions = await this.dataSource.query(
        `SELECT id, amount, commission FROM partnerops_conversions
         WHERE partner_id = $1 AND tenant_id = $2 AND status = 'confirmed'
         AND created_at >= $3 AND created_at <= $4`,
        [partnerId, tenantId, startDate, endDate]
      );

      const totalAmount = conversions.reduce((sum: number, c: any) => sum + parseFloat(c.amount), 0);
      const totalCommission = conversions.reduce((sum: number, c: any) => sum + parseFloat(c.commission), 0);
      const conversionCount = conversions.length;

      // 배치 생성
      const result = await this.dataSource.query(
        `INSERT INTO partnerops_settlement_batches
         (tenant_id, partner_id, period, total_amount, total_commission, conversion_count, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
         RETURNING id, partner_id as "partnerId", period,
                   total_amount as "totalAmount", total_commission as "totalCommission",
                   conversion_count as "conversionCount", status,
                   paid_at as "paidAt", created_at as "createdAt"`,
        [tenantId, partnerId, period, totalAmount, totalCommission, conversionCount]
      );

      const batch = result[0];

      // 트랜잭션 생성
      for (const conversion of conversions) {
        await this.dataSource.query(
          `INSERT INTO partnerops_settlement_transactions
           (tenant_id, batch_id, conversion_id, amount, commission, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [tenantId, batch.id, conversion.id, conversion.amount, conversion.commission]
        );
      }

      return batch;
    } catch (error) {
      console.error('SettlementService createBatch error:', error);
      return this.createEmptyBatch(partnerId, period);
    }
  }

  /**
   * 정산 처리 (관리자용)
   */
  async processBatch(tenantId: string, batchId: string): Promise<SettlementBatch> {
    if (!this.dataSource) {
      throw new Error('DataSource not available');
    }

    try {
      // 배치 상태 업데이트
      const result = await this.dataSource.query(
        `UPDATE partnerops_settlement_batches
         SET status = 'completed', paid_at = NOW()
         WHERE id = $1 AND tenant_id = $2
         RETURNING id, partner_id as "partnerId", period,
                   total_amount as "totalAmount", total_commission as "totalCommission",
                   conversion_count as "conversionCount", status,
                   paid_at as "paidAt", created_at as "createdAt"`,
        [batchId, tenantId]
      );

      // 관련 전환 상태 업데이트
      await this.dataSource.query(
        `UPDATE partnerops_conversions c
         SET status = 'paid'
         FROM partnerops_settlement_transactions t
         WHERE t.conversion_id = c.id AND t.batch_id = $1`,
        [batchId]
      );

      return result[0];
    } catch (error) {
      console.error('SettlementService processBatch error:', error);
      throw error;
    }
  }

  /**
   * 커미션 적용 (이벤트 핸들러용)
   */
  async applyCommission(tenantId: string, transaction: {
    partnerId: string;
    conversionId: string;
    amount: number;
    commission: number;
  }): Promise<void> {
    // 전환 상태만 confirmed로 업데이트 (정산 배치 생성 시 포함됨)
    if (!this.dataSource) return;

    try {
      await this.dataSource.query(
        `UPDATE partnerops_conversions
         SET status = 'confirmed', confirmed_at = NOW()
         WHERE id = $1 AND partner_id = $2 AND tenant_id = $3`,
        [transaction.conversionId, transaction.partnerId, tenantId]
      );
    } catch (error) {
      console.error('SettlementService applyCommission error:', error);
    }
  }

  /**
   * 정산 배치 마감 (이벤트 핸들러용)
   */
  async closeBatch(tenantId: string, batch: { id: string }): Promise<void> {
    if (!this.dataSource) return;

    try {
      await this.processBatch(tenantId, batch.id);
    } catch (error) {
      console.error('SettlementService closeBatch error:', error);
    }
  }

  private getEmptySummary(): SettlementSummary {
    return {
      totalEarnings: 0,
      paidEarnings: 0,
      pendingEarnings: 0,
    };
  }

  private createEmptyBatch(partnerId: string, period: string): SettlementBatch {
    return {
      id: '',
      partnerId,
      period,
      totalAmount: 0,
      totalCommission: 0,
      conversionCount: 0,
      status: 'pending',
      createdAt: new Date(),
    };
  }
}

export const settlementService = new SettlementService();
export default settlementService;
