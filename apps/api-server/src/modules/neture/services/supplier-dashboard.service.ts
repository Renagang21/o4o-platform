import type { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import logger from '../../../utils/logger.js';
import { SupplierProductOffer } from '../entities/index.js';
import { getServiceOrigin } from '../../../config/service-catalog.js';

/** Supplier-scoped approval and product summaries. Queries and response contracts are unchanged. */
export class NetureSupplierDashboardService {
  private _offerRepo?: Repository<SupplierProductOffer>;

  private get offerRepo(): Repository<SupplierProductOffer> {
    if (!this._offerRepo) this._offerRepo = AppDataSource.getRepository(SupplierProductOffer);
    return this._offerRepo;
  }

  async getSupplierOrdersSummary(supplierId: string) {
    try {
      // WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-REMOVAL-V1: v2 product_approvals
      const approvedByService: Array<{ serviceId: string; serviceName: string; approvedCount: string; lastApprovedAt: string }> = await AppDataSource.query(
        `SELECT pa.service_key AS "serviceId", pa.service_key AS "serviceName",
                COUNT(*)::text AS "approvedCount",
                MAX(pa.decided_at)::text AS "lastApprovedAt"
         FROM product_approvals pa
         JOIN supplier_product_offers spo ON spo.id = pa.offer_id
         WHERE spo.supplier_id = $1 AND pa.approval_type = 'private' AND pa.approval_status = 'approved'
         GROUP BY pa.service_key`,
        [supplierId],
      );

      // 서비스 설정 (실제로는 DB나 설정에서 가져와야 함)
      const serviceConfig: Record<string, {
        url: string;
        ordersPath: string;
        supportEmail?: string;
        features: string[];
      }> = {
        'k-cosmetics': {
          // 호스트는 카탈로그 파생 — 하드코딩 `k-cosmetics.neture.co.kr` 은 NXDOMAIN 이었다(URL-FIRST-CENSUS §7-1)
          url: getServiceOrigin('k-cosmetics') ?? '',
          ordersPath: '/supplier/orders',
          supportEmail: 'support@k-cosmetics.kr',
          features: ['주문관리', '배송조회'],
        },
      };

      // 기본 설정 (타입 안전성을 위해)
      const defaultConfig = {
        url: '',
        ordersPath: '',
        supportEmail: '',
        features: [] as string[],
      };

      // 각 서비스에 대해 최근 이벤트 조회
      const serviceDetails = await Promise.all(
        approvedByService.map(async (svc) => {
          const config = serviceConfig[svc.serviceId] || defaultConfig;

          // WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-REMOVAL-V1: event table dropped
          const recentEvents: Array<{ eventType: string; sellerName: string; productName: string; createdAt: Date }> = [];

          const [{ cnt: pendingCount }] = await AppDataSource.query(
            `SELECT COUNT(*)::int AS cnt FROM product_approvals pa
             JOIN supplier_product_offers spo ON spo.id = pa.offer_id
             WHERE spo.supplier_id = $1 AND pa.approval_type = 'private'
               AND pa.approval_status = 'pending' AND pa.service_key = $2`,
            [supplierId, svc.serviceId],
          );

          return {
            serviceId: svc.serviceId,
            serviceName: svc.serviceName,
            summary: {
              approvedSellerCount: Number.parseInt(svc.approvedCount, 10),
              pendingRequestCount: pendingCount,
              lastApprovedAt: svc.lastApprovedAt || null,
            },
            navigation: {
              serviceUrl: config.url || null,
              ordersUrl: config.url ? `${config.url}${config.ordersPath}` : null,
              supportEmail: config.supportEmail || null,
            },
            features: config.features || [],
            recentActivity: recentEvents,
            notice: 'Neture에서는 주문을 직접 처리하지 않습니다. 해당 서비스에서 주문을 관리하세요.',
          };
        })
      );

      return {
        services: serviceDetails,
        totalApprovedSellers: serviceDetails.reduce((sum, s) => sum + s.summary.approvedSellerCount, 0),
        totalPendingRequests: serviceDetails.reduce((sum, s) => sum + s.summary.pendingRequestCount, 0),
      };
    } catch (error) {
      logger.error('[NetureDashboardService] Error fetching order summary:', error);
      throw error;
    }
  }

  async getSupplierDashboardSummary(supplierId: string) {
    try {
      // WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-REMOVAL-V1: v2 product_approvals
      const [reqStats] = await AppDataSource.query(`
        SELECT COUNT(*)::int AS "totalRequests",
          COUNT(*) FILTER (WHERE pa.approval_status = 'pending')::int AS "pendingRequests",
          COUNT(*) FILTER (WHERE pa.approval_status = 'approved')::int AS "approvedRequests",
          COUNT(*) FILTER (WHERE pa.approval_status = 'rejected')::int AS "rejectedRequests"
        FROM product_approvals pa
        JOIN supplier_product_offers spo ON spo.id = pa.offer_id
        WHERE spo.supplier_id = $1 AND pa.approval_type = 'private'
      `, [supplierId]);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const [{ count: recentApprovals }] = await AppDataSource.query(`
        SELECT COUNT(*)::int AS count FROM product_approvals pa
        JOIN supplier_product_offers spo ON spo.id = pa.offer_id
        WHERE spo.supplier_id = $1 AND pa.approval_type = 'private'
          AND pa.approval_status = 'approved' AND pa.decided_at >= $2
      `, [supplierId, sevenDaysAgo]);

      // 제품 통계
      const offers = await this.offerRepo.find({ where: { supplierId } });
      const activeProducts = offers.filter((o) => o.isActive).length;
      const totalProducts = offers.length;

      // 연결된 서비스 수
      const [{ count: connectedCount }] = await AppDataSource.query(`
        SELECT COUNT(DISTINCT pa.service_key)::int AS count FROM product_approvals pa
        JOIN supplier_product_offers spo ON spo.id = pa.offer_id
        WHERE spo.supplier_id = $1 AND pa.approval_type = 'private' AND pa.approval_status = 'approved'
      `, [supplierId]);

      // 서비스별 통계
      const serviceStats: Array<{ serviceId: string; serviceName: string; pending: number; approved: number; rejected: number }> = await AppDataSource.query(`
        SELECT pa.service_key AS "serviceId", pa.service_key AS "serviceName",
          SUM(CASE WHEN pa.approval_status = 'pending' THEN 1 ELSE 0 END)::int AS pending,
          SUM(CASE WHEN pa.approval_status = 'approved' THEN 1 ELSE 0 END)::int AS approved,
          SUM(CASE WHEN pa.approval_status = 'rejected' THEN 1 ELSE 0 END)::int AS rejected
        FROM product_approvals pa
        JOIN supplier_product_offers spo ON spo.id = pa.offer_id
        WHERE spo.supplier_id = $1 AND pa.approval_type = 'private'
        GROUP BY pa.service_key
      `, [supplierId]);

      return {
        stats: {
          totalRequests: reqStats.totalRequests,
          pendingRequests: reqStats.pendingRequests,
          approvedRequests: reqStats.approvedRequests,
          rejectedRequests: reqStats.rejectedRequests,
          recentApprovals: Number(recentApprovals),
          totalProducts,
          activeProducts,
          totalContents: 0,
          publishedContents: 0,
          connectedServices: Number(connectedCount),
        },
        serviceStats: serviceStats.map((s) => ({
          serviceId: s.serviceId,
          serviceName: s.serviceName,
          pending: s.pending,
          approved: s.approved,
          rejected: s.rejected,
        })),
        recentActivity: [], // WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-REMOVAL-V1: event table dropped
      };
    } catch (error) {
      logger.error('[NetureDashboardService] Error fetching supplier dashboard summary:', error);
      throw error;
    }
  }
}
