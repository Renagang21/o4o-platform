/**
 * Conversion Service
 *
 * 파트너 전환(구매) 추적 서비스
 */

import type { DataSource } from 'typeorm';

export interface Conversion {
  id: string;
  partnerId: string;
  linkId: string;
  orderId: string;
  productId: string;
  amount: number;
  commission: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'paid';
  createdAt: Date;
  confirmedAt?: Date;
}

export interface ConversionSummary {
  totalConversions: number;
  confirmedConversions: number;
  pendingConversions: number;
  totalAmount: number;
  totalCommission: number;
  conversionRate: number;
}

export interface ConversionFunnel {
  impressions: number;
  clicks: number;
  addToCarts: number;
  checkouts: number;
  purchases: number;
}

export class ConversionService {
  constructor(private readonly dataSource?: DataSource) {}

  /**
   * 전환 목록 조회
   */
  async list(
    tenantId: string,
    partnerId: string,
    filters?: { status?: string; startDate?: Date; endDate?: Date }
  ): Promise<Conversion[]> {
    if (!this.dataSource) {
      return [];
    }

    try {
      let query = `
        SELECT id, partner_id as "partnerId", link_id as "linkId",
               order_id as "orderId", product_id as "productId",
               amount, commission, status,
               created_at as "createdAt", confirmed_at as "confirmedAt"
        FROM partnerops_conversions
        WHERE partner_id = $1 AND tenant_id = $2
      `;
      const params: any[] = [partnerId, tenantId];
      let paramIndex = 3;

      if (filters?.status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(filters.status);
      }

      if (filters?.startDate) {
        query += ` AND created_at >= $${paramIndex++}`;
        params.push(filters.startDate);
      }

      if (filters?.endDate) {
        query += ` AND created_at <= $${paramIndex++}`;
        params.push(filters.endDate);
      }

      query += ` ORDER BY created_at DESC`;

      return await this.dataSource.query(query, params);
    } catch (error) {
      console.error('ConversionService list error:', error);
      return [];
    }
  }

  /**
   * 전환 요약 조회
   */
  async getSummary(tenantId: string, partnerId: string): Promise<ConversionSummary> {
    if (!this.dataSource) {
      return this.getEmptySummary();
    }

    try {
      const result = await this.dataSource.query(
        `SELECT
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
           COUNT(*) FILTER (WHERE status = 'pending') as pending,
           COALESCE(SUM(amount), 0) as total_amount,
           COALESCE(SUM(commission), 0) as total_commission
         FROM partnerops_conversions
         WHERE partner_id = $1 AND tenant_id = $2`,
        [partnerId, tenantId]
      );

      const totalConversions = parseInt(result[0]?.total || '0');
      const confirmedConversions = parseInt(result[0]?.confirmed || '0');
      const pendingConversions = parseInt(result[0]?.pending || '0');
      const totalAmount = parseFloat(result[0]?.total_amount || '0');
      const totalCommission = parseFloat(result[0]?.total_commission || '0');

      // 클릭 수 조회 (전환율 계산용)
      const clicksResult = await this.dataSource.query(
        `SELECT COUNT(*) as count FROM partnerops_clicks c
         JOIN partnerops_links l ON c.link_id = l.id
         WHERE l.partner_id = $1 AND l.tenant_id = $2`,
        [partnerId, tenantId]
      );
      const totalClicks = parseInt(clicksResult[0]?.count || '0');
      const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

      return {
        totalConversions,
        confirmedConversions,
        pendingConversions,
        totalAmount,
        totalCommission,
        conversionRate: Math.round(conversionRate * 100) / 100,
      };
    } catch (error) {
      console.error('ConversionService getSummary error:', error);
      return this.getEmptySummary();
    }
  }

  /**
   * 퍼널 분석 조회
   */
  async getFunnel(tenantId: string, partnerId: string, startDate?: Date, endDate?: Date): Promise<ConversionFunnel> {
    if (!this.dataSource) {
      return this.getEmptyFunnel();
    }

    try {
      let dateFilter = '';
      const params: any[] = [partnerId, tenantId];
      let paramIndex = 3;

      if (startDate) {
        dateFilter += ` AND created_at >= $${paramIndex++}`;
        params.push(startDate);
      }
      if (endDate) {
        dateFilter += ` AND created_at <= $${paramIndex++}`;
        params.push(endDate);
      }

      // 클릭 수
      const clicksResult = await this.dataSource.query(
        `SELECT COUNT(*) as count FROM partnerops_clicks c
         JOIN partnerops_links l ON c.link_id = l.id
         WHERE l.partner_id = $1 AND l.tenant_id = $2 ${dateFilter}`,
        params
      );

      // 전환 수
      const conversionsResult = await this.dataSource.query(
        `SELECT COUNT(*) as count FROM partnerops_conversions
         WHERE partner_id = $1 AND tenant_id = $2 ${dateFilter}`,
        params
      );

      return {
        impressions: 0, // TODO: 노출수 추적 구현 필요
        clicks: parseInt(clicksResult[0]?.count || '0'),
        addToCarts: 0, // TODO: 장바구니 추적 구현 필요
        checkouts: 0, // TODO: 결제 시도 추적 구현 필요
        purchases: parseInt(conversionsResult[0]?.count || '0'),
      };
    } catch (error) {
      console.error('ConversionService getFunnel error:', error);
      return this.getEmptyFunnel();
    }
  }

  /**
   * 전환 기록 (주문 생성 시)
   */
  async recordConversion(
    tenantId: string,
    data: {
      partnerId: string;
      linkId: string;
      orderId: string;
      productId: string;
      amount: number;
      commissionRate: number;
    }
  ): Promise<Conversion> {
    const commission = data.amount * data.commissionRate;

    if (!this.dataSource) {
      return this.createEmptyConversion(data, commission);
    }

    try {
      const result = await this.dataSource.query(
        `INSERT INTO partnerops_conversions
         (tenant_id, partner_id, link_id, order_id, product_id, amount, commission, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())
         RETURNING id, partner_id as "partnerId", link_id as "linkId",
                   order_id as "orderId", product_id as "productId",
                   amount, commission, status,
                   created_at as "createdAt", confirmed_at as "confirmedAt"`,
        [tenantId, data.partnerId, data.linkId, data.orderId, data.productId, data.amount, commission]
      );

      // 링크 전환 카운트 증가
      await this.dataSource.query(
        `UPDATE partnerops_links SET conversion_count = conversion_count + 1, updated_at = NOW()
         WHERE id = $1`,
        [data.linkId]
      );

      return result[0];
    } catch (error) {
      console.error('ConversionService recordConversion error:', error);
      return this.createEmptyConversion(data, commission);
    }
  }

  /**
   * 주문 정보로 전환 기록 생성 (이벤트 핸들러용)
   */
  async createFromOrder(tenantId: string, order: {
    id: string;
    partnerId?: string;
    linkId?: string;
    productId?: string;
    amount: number;
    commissionRate?: number;
  }): Promise<Conversion | null> {
    if (!order.partnerId || !order.linkId) {
      return null;
    }

    return this.recordConversion(tenantId, {
      partnerId: order.partnerId,
      linkId: order.linkId,
      orderId: order.id,
      productId: order.productId || '',
      amount: order.amount,
      commissionRate: order.commissionRate || 0.1, // 기본 10%
    });
  }

  /**
   * 전환 확정
   */
  async confirmConversion(tenantId: string, id: string): Promise<Conversion> {
    if (!this.dataSource) {
      throw new Error('DataSource not available');
    }

    try {
      const result = await this.dataSource.query(
        `UPDATE partnerops_conversions
         SET status = 'confirmed', confirmed_at = NOW()
         WHERE id = $1 AND tenant_id = $2
         RETURNING id, partner_id as "partnerId", link_id as "linkId",
                   order_id as "orderId", product_id as "productId",
                   amount, commission, status,
                   created_at as "createdAt", confirmed_at as "confirmedAt"`,
        [id, tenantId]
      );
      return result[0];
    } catch (error) {
      console.error('ConversionService confirmConversion error:', error);
      throw error;
    }
  }

  private getEmptySummary(): ConversionSummary {
    return {
      totalConversions: 0,
      confirmedConversions: 0,
      pendingConversions: 0,
      totalAmount: 0,
      totalCommission: 0,
      conversionRate: 0,
    };
  }

  private getEmptyFunnel(): ConversionFunnel {
    return {
      impressions: 0,
      clicks: 0,
      addToCarts: 0,
      checkouts: 0,
      purchases: 0,
    };
  }

  private createEmptyConversion(
    data: { partnerId: string; linkId: string; orderId: string; productId: string; amount: number },
    commission: number
  ): Conversion {
    return {
      id: '',
      partnerId: data.partnerId,
      linkId: data.linkId,
      orderId: data.orderId,
      productId: data.productId,
      amount: data.amount,
      commission,
      status: 'pending',
      createdAt: new Date(),
    };
  }
}

export const conversionService = new ConversionService();
export default conversionService;
