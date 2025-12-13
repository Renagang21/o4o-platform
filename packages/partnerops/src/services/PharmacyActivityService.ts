/**
 * Pharmacy Activity Service
 *
 * 약국 활동 데이터를 조회하는 서비스입니다.
 * Partner-Core의 PharmacyEventReceiver를 통해 기록된 데이터를 조회합니다.
 *
 * IMPORTANT: PHARMACEUTICAL 제품은 표시되지 않습니다 (read-only).
 *
 * @package @o4o/partnerops
 */

import type { DataSource, Repository } from 'typeorm';
import { ConversionSource, ConversionStatus } from '@o4o/partner-core';

// 파트너 프로그램 제외 제품 타입
const EXCLUDED_PRODUCT_TYPES = ['pharmaceutical'];

/**
 * 약국 활동 목록 아이템
 */
export interface PharmacyActivityItem {
  id: string;
  pharmacyId: string;
  pharmacyName?: string;
  orderId: string;
  orderNumber?: string;
  productType?: string;
  productName?: string;
  orderAmount: number;
  status: string;
  createdAt: Date;
}

/**
 * 약국 활동 필터
 */
export interface PharmacyActivityFilter {
  productType?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

/**
 * 약국 활동 통계
 */
export interface PharmacyActivityStats {
  totalPharmacies: number;
  totalConversions: number;
  totalOrderAmount: number;
  byProductType: Record<string, { count: number; amount: number }>;
  byStatus: Record<string, number>;
  trend: Array<{
    date: string;
    count: number;
    amount: number;
  }>;
}

export class PharmacyActivityService {
  constructor(private readonly dataSource?: DataSource) {}

  /**
   * 약국 활동 목록 조회 (PartnerOps UI용)
   */
  async getActivityList(
    tenantId: string,
    filter: PharmacyActivityFilter = {}
  ): Promise<{
    items: PharmacyActivityItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    if (!this.dataSource) {
      return { items: [], total: 0, page: 1, limit: 20 };
    }

    const { page = 1, limit = 20, productType, status, startDate, endDate } = filter;
    const offset = (page - 1) * limit;

    try {
      // 기본 조건: pharmacy 소스, PHARMACEUTICAL 제외
      let whereClause = `
        conversion_source = 'pharmacy'
        AND (product_type IS NULL OR product_type NOT IN (${EXCLUDED_PRODUCT_TYPES.map((_, i) => `$${i + 1}`).join(', ')}))
      `;
      const params: any[] = [...EXCLUDED_PRODUCT_TYPES];
      let paramIndex = params.length + 1;

      if (productType) {
        whereClause += ` AND product_type = $${paramIndex}`;
        params.push(productType);
        paramIndex++;
      }

      if (status) {
        whereClause += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (startDate) {
        whereClause += ` AND created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereClause += ` AND created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      // 총 개수 조회
      const countResult = await this.dataSource.query(
        `SELECT COUNT(*) as count FROM partner_conversions WHERE ${whereClause}`,
        params
      );
      const total = parseInt(countResult[0]?.count || '0', 10);

      // 목록 조회
      const listParams = [...params, limit, offset];
      const items = await this.dataSource.query(
        `SELECT
          id,
          pharmacy_id as "pharmacyId",
          order_id as "orderId",
          order_number as "orderNumber",
          product_type as "productType",
          order_amount as "orderAmount",
          status,
          metadata,
          created_at as "createdAt"
        FROM partner_conversions
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        listParams
      );

      return {
        items: items.map((item: any) => ({
          id: item.id,
          pharmacyId: item.pharmacyId || '',
          pharmacyName: item.metadata?.pharmacyName,
          orderId: item.orderId,
          orderNumber: item.orderNumber,
          productType: item.productType,
          productName: item.metadata?.productName,
          orderAmount: parseFloat(item.orderAmount || '0'),
          status: item.status,
          createdAt: new Date(item.createdAt),
        })),
        total,
        page,
        limit,
      };
    } catch (error) {
      console.error('PharmacyActivityService getActivityList error:', error);
      return { items: [], total: 0, page, limit };
    }
  }

  /**
   * 약국 활동 통계 조회 (PartnerOps 대시보드용)
   */
  async getActivityStats(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<PharmacyActivityStats> {
    if (!this.dataSource) {
      return this.getEmptyStats();
    }

    try {
      const baseWhereClause = `
        conversion_source = 'pharmacy'
        AND (product_type IS NULL OR product_type NOT IN ('pharmaceutical'))
      `;
      const params: any[] = [];
      let whereClause = baseWhereClause;
      let paramIndex = 1;

      if (startDate) {
        whereClause += ` AND created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereClause += ` AND created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      // 기본 통계
      const totalResult = await this.dataSource.query(
        `SELECT
          COUNT(DISTINCT pharmacy_id) as total_pharmacies,
          COUNT(*) as total_conversions,
          COALESCE(SUM(order_amount), 0) as total_amount
        FROM partner_conversions
        WHERE ${whereClause}`,
        params
      );

      // 제품 타입별 통계
      const productTypeResult = await this.dataSource.query(
        `SELECT
          product_type,
          COUNT(*) as count,
          COALESCE(SUM(order_amount), 0) as amount
        FROM partner_conversions
        WHERE ${whereClause} AND product_type IS NOT NULL
        GROUP BY product_type`,
        params
      );

      // 상태별 통계
      const statusResult = await this.dataSource.query(
        `SELECT
          status,
          COUNT(*) as count
        FROM partner_conversions
        WHERE ${whereClause}
        GROUP BY status`,
        params
      );

      // 일별 트렌드 (최근 30일)
      const trendResult = await this.dataSource.query(
        `SELECT
          DATE(created_at) as date,
          COUNT(*) as count,
          COALESCE(SUM(order_amount), 0) as amount
        FROM partner_conversions
        WHERE ${whereClause}
          AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC`,
        params
      );

      const byProductType: Record<string, { count: number; amount: number }> = {};
      for (const row of productTypeResult) {
        if (row.product_type) {
          byProductType[row.product_type] = {
            count: parseInt(row.count, 10),
            amount: parseFloat(row.amount),
          };
        }
      }

      const byStatus: Record<string, number> = {};
      for (const row of statusResult) {
        byStatus[row.status] = parseInt(row.count, 10);
      }

      const trend = trendResult.map((row: any) => ({
        date: row.date.toISOString().split('T')[0],
        count: parseInt(row.count, 10),
        amount: parseFloat(row.amount),
      }));

      return {
        totalPharmacies: parseInt(totalResult[0]?.total_pharmacies || '0', 10),
        totalConversions: parseInt(totalResult[0]?.total_conversions || '0', 10),
        totalOrderAmount: parseFloat(totalResult[0]?.total_amount || '0'),
        byProductType,
        byStatus,
        trend,
      };
    } catch (error) {
      console.error('PharmacyActivityService getActivityStats error:', error);
      return this.getEmptyStats();
    }
  }

  /**
   * 약국별 상세 활동 조회
   */
  async getPharmacyDetail(
    tenantId: string,
    pharmacyId: string
  ): Promise<{
    pharmacyId: string;
    totalConversions: number;
    totalOrderAmount: number;
    byProductType: Record<string, { count: number; amount: number }>;
    recentActivity: PharmacyActivityItem[];
  } | null> {
    if (!this.dataSource) {
      return null;
    }

    try {
      // 총계
      const totalResult = await this.dataSource.query(
        `SELECT
          COUNT(*) as count,
          COALESCE(SUM(order_amount), 0) as amount
        FROM partner_conversions
        WHERE pharmacy_id = $1
          AND conversion_source = 'pharmacy'
          AND (product_type IS NULL OR product_type NOT IN ('pharmaceutical'))`,
        [pharmacyId]
      );

      // 제품 타입별
      const productTypeResult = await this.dataSource.query(
        `SELECT
          product_type,
          COUNT(*) as count,
          COALESCE(SUM(order_amount), 0) as amount
        FROM partner_conversions
        WHERE pharmacy_id = $1
          AND conversion_source = 'pharmacy'
          AND product_type IS NOT NULL
          AND product_type NOT IN ('pharmaceutical')
        GROUP BY product_type`,
        [pharmacyId]
      );

      // 최근 활동
      const recentResult = await this.dataSource.query(
        `SELECT
          id,
          pharmacy_id as "pharmacyId",
          order_id as "orderId",
          order_number as "orderNumber",
          product_type as "productType",
          order_amount as "orderAmount",
          status,
          metadata,
          created_at as "createdAt"
        FROM partner_conversions
        WHERE pharmacy_id = $1
          AND conversion_source = 'pharmacy'
          AND (product_type IS NULL OR product_type NOT IN ('pharmaceutical'))
        ORDER BY created_at DESC
        LIMIT 10`,
        [pharmacyId]
      );

      const byProductType: Record<string, { count: number; amount: number }> = {};
      for (const row of productTypeResult) {
        if (row.product_type) {
          byProductType[row.product_type] = {
            count: parseInt(row.count, 10),
            amount: parseFloat(row.amount),
          };
        }
      }

      return {
        pharmacyId,
        totalConversions: parseInt(totalResult[0]?.count || '0', 10),
        totalOrderAmount: parseFloat(totalResult[0]?.amount || '0'),
        byProductType,
        recentActivity: recentResult.map((item: any) => ({
          id: item.id,
          pharmacyId: item.pharmacyId || '',
          orderId: item.orderId,
          orderNumber: item.orderNumber,
          productType: item.productType,
          productName: item.metadata?.productName,
          orderAmount: parseFloat(item.orderAmount || '0'),
          status: item.status,
          createdAt: new Date(item.createdAt),
        })),
      };
    } catch (error) {
      console.error('PharmacyActivityService getPharmacyDetail error:', error);
      return null;
    }
  }

  private getEmptyStats(): PharmacyActivityStats {
    return {
      totalPharmacies: 0,
      totalConversions: 0,
      totalOrderAmount: 0,
      byProductType: {},
      byStatus: {},
      trend: [],
    };
  }
}

export const pharmacyActivityService = new PharmacyActivityService();
export default pharmacyActivityService;
