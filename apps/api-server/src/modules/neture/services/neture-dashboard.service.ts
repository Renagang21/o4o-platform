import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import {
  NetureSupplier,
  SupplierProductOffer,
  NeturePartnershipRequest,
  OfferDistributionType,
  OfferApprovalStatus,
  SupplierStatus,
  PartnershipStatus,
} from '../entities/index.js';
import logger from '../../../utils/logger.js';

/**
 * NetureDashboardService
 *
 * Dashboard summary/statistics for supplier, admin, partner, seller.
 * Mostly raw SQL queries — read-only aggregation.
 *
 * Extracted from NetureService (WO-O4O-NETURE-SERVICE-SPLIT-V1 Phase 2).
 */
export class NetureDashboardService {
  // Lazy repositories (only used for count queries in getAdminDashboardSummary / getSupplierDashboardSummary)
  private _supplierRepo?: Repository<NetureSupplier>;
  private _offerRepo?: Repository<SupplierProductOffer>;
  private _partnershipRepo?: Repository<NeturePartnershipRequest>;

  private get supplierRepo(): Repository<NetureSupplier> {
    if (!this._supplierRepo) {
      this._supplierRepo = AppDataSource.getRepository(NetureSupplier);
    }
    return this._supplierRepo;
  }

  private get offerRepo(): Repository<SupplierProductOffer> {
    if (!this._offerRepo) {
      this._offerRepo = AppDataSource.getRepository(SupplierProductOffer);
    }
    return this._offerRepo;
  }

  private get partnershipRepo(): Repository<NeturePartnershipRequest> {
    if (!this._partnershipRepo) {
      this._partnershipRepo = AppDataSource.getRepository(NeturePartnershipRequest);
    }
    return this._partnershipRepo;
  }

  // ==================== Order Summary (WO-NETURE-SUPPLIER-DASHBOARD-P0 §3.4, P1 §3.3) ====================

  /**
   * GET /supplier/orders/summary - 서비스별 주문 요약
   */
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
        glycopharm: {
          url: 'https://glycopharm.neture.co.kr',
          ordersPath: '/supplier/orders',
          supportEmail: 'support@glycopharm.kr',
          features: ['주문관리', '배송조회', '반품처리'],
        },
        'k-cosmetics': {
          url: 'https://k-cosmetics.neture.co.kr',
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
              approvedSellerCount: parseInt(svc.approvedCount, 10),
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

  // ==================== Dashboard Summary API ====================

  /**
   * GET /supplier/dashboard/summary - 공급자 대시보드 통계 요약
   */
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

  /**
   * GET /admin/dashboard/summary - 운영자/관리자 대시보드 통계 요약
   */
  async getAdminDashboardSummary() {
    try {
      // 공급자 통계
      const totalSuppliers = await this.supplierRepo.count();
      const activeSuppliers = await this.supplierRepo.count({
        where: { status: SupplierStatus.ACTIVE },
      });
      const pendingSuppliers = await this.supplierRepo.count({
        where: { status: SupplierStatus.PENDING },
      });

      // Offer 통계 (WO-O4O-PRODUCT-MASTER-CORE-RESET-V1)
      const totalProducts = await this.offerRepo.count();
      const pendingProducts = await this.offerRepo.count({
        where: { approvalStatus: OfferApprovalStatus.PENDING },
      });
      const publicProducts = await this.offerRepo.count({ where: { distributionType: OfferDistributionType.PUBLIC } });
      const serviceProducts = await this.offerRepo.count({ where: { distributionType: OfferDistributionType.SERVICE } });
      const privateProducts = await this.offerRepo.count({ where: { distributionType: OfferDistributionType.PRIVATE } });

      // WO-NETURE-DISTRIBUTION-TIER-REALIGN-BETA-V1: 전체 approval 통계 (SERVICE + PRIVATE)
      const [adminReqStats] = await AppDataSource.query(`
        SELECT COUNT(*)::int AS "totalRequests",
          COUNT(*) FILTER (WHERE approval_status = 'pending')::int AS "pendingRequests",
          COUNT(*) FILTER (WHERE approval_status = 'approved')::int AS "approvedRequests",
          COUNT(*) FILTER (WHERE approval_status = 'rejected')::int AS "rejectedRequests"
        FROM product_approvals
      `);

      // Tier별 approval 분해 통계
      const tierStats: Array<{ approval_type: string; total: number; pending: number; approved: number; rejected: number }> = await AppDataSource.query(`
        SELECT approval_type,
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE approval_status = 'pending')::int AS pending,
          COUNT(*) FILTER (WHERE approval_status = 'approved')::int AS approved,
          COUNT(*) FILTER (WHERE approval_status = 'rejected')::int AS rejected
        FROM product_approvals
        GROUP BY approval_type
      `);
      const emptyTier = { total: 0, pending: 0, approved: 0, rejected: 0 };
      const serviceTier = tierStats.find((t) => t.approval_type === 'service') || emptyTier;
      const privateTier = tierStats.find((t) => t.approval_type === 'private') || emptyTier;

      // 파트너십 요청 통계
      const totalPartnershipRequests = await this.partnershipRepo.count();
      const openPartnershipRequests = await this.partnershipRepo.count({
        where: { status: PartnershipStatus.OPEN },
      });

      // 서비스별 공급자/파트너 통계 (SERVICE + PRIVATE 모두 포함)
      const serviceStats: Array<{ serviceId: string; serviceName: string; suppliers: number; partners: number }> = await AppDataSource.query(`
        SELECT pa.service_key AS "serviceId", pa.service_key AS "serviceName",
          COUNT(DISTINCT CASE WHEN pa.approval_status = 'approved' THEN spo.supplier_id END)::int AS suppliers,
          COUNT(DISTINCT CASE WHEN pa.approval_status = 'approved' THEN pa.organization_id END)::int AS partners
        FROM product_approvals pa
        JOIN supplier_product_offers spo ON spo.id = pa.offer_id
        GROUP BY pa.service_key
      `);

      // 최근 요청 (대기 중 — SERVICE + PRIVATE)
      const recentPending: Array<{ id: string; sellerId: string; createdAt: Date }> = await AppDataSource.query(`
        SELECT pa.id, pa.organization_id AS "sellerId", pa.created_at AS "createdAt"
        FROM product_approvals pa WHERE pa.approval_status = 'pending'
        ORDER BY pa.created_at DESC LIMIT 5
      `);

      // WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-REMOVAL-V1: event table dropped
      const recentEvents: Array<{ id: string; eventType: string; sellerName: string; productName: string; serviceName: string; createdAt: Date }> = [];

      return {
        stats: {
          totalSuppliers,
          activeSuppliers,
          pendingSuppliers,
          totalRequests: adminReqStats.totalRequests,
          pendingRequests: adminReqStats.pendingRequests,
          approvedRequests: adminReqStats.approvedRequests,
          rejectedRequests: adminReqStats.rejectedRequests,
          totalPartnershipRequests,
          openPartnershipRequests,
          totalContents: 0,
          publishedContents: 0,
          totalProducts,
          pendingProducts,
          distributionTypeBreakdown: { PUBLIC: publicProducts, SERVICE: serviceProducts, PRIVATE: privateProducts },
          approvalByTier: {
            SERVICE: { total: serviceTier.total, pending: serviceTier.pending, approved: serviceTier.approved, rejected: serviceTier.rejected },
            PRIVATE: { total: privateTier.total, pending: privateTier.pending, approved: privateTier.approved, rejected: privateTier.rejected },
          },
        },
        serviceStatus: serviceStats.map((s) => ({
          serviceId: s.serviceId,
          serviceName: s.serviceName,
          suppliers: s.suppliers,
          partners: s.partners,
          status: 'active' as const,
        })),
        recentApplications: recentPending.map((r) => ({
          id: r.id,
          name: r.sellerId,
          type: '공급자 신청',
          date: r.createdAt,
          status: '대기중',
        })),
        recentActivities: recentEvents.map((e) => ({
          id: e.id,
          type: e.eventType,
          text: `${e.sellerName} - ${e.productName} (${e.serviceName})`,
          time: e.createdAt,
        })),
      };
    } catch (error) {
      logger.error('[NetureDashboardService] Error fetching admin dashboard summary:', error);
      throw error;
    }
  }

  /**
   * GET /partner/dashboard/summary - 파트너 대시보드 통계 요약
   */
  async getPartnerDashboardSummary(userId: string) {
    try {
      // 파트너십 요청 통계
      const partnershipRequests = await this.partnershipRepo.find({
        where: { sellerId: userId },
      });

      const totalRequests = partnershipRequests.length;
      const openRequests = partnershipRequests.filter((r) => r.status === PartnershipStatus.OPEN).length;
      const matchedRequests = partnershipRequests.filter((r) => r.status === PartnershipStatus.MATCHED).length;
      const closedRequests = partnershipRequests.filter((r) => r.status === PartnershipStatus.CLOSED).length;

      // WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-REMOVAL-V1: v2 product_approvals
      const sellerApprovals: Array<{ id: string; serviceId: string; serviceName: string; createdAt: string }> = await AppDataSource.query(`
        SELECT pa.id, pa.service_key AS "serviceId", pa.service_key AS "serviceName",
               pa.created_at AS "createdAt"
        FROM product_approvals pa
        WHERE pa.organization_id = $1 AND pa.approval_type = 'private' AND pa.approval_status = 'approved'
      `, [userId]);

      // 연결된 서비스 (중복 제거)
      const connectedServicesMap = new Map<string, {
        serviceId: string;
        serviceName: string;
        supplierCount: number;
        lastActivity: Date;
      }>();

      sellerApprovals.forEach((r) => {
        const existing = connectedServicesMap.get(r.serviceId);
        if (existing) {
          existing.supplierCount++;
          if (new Date(r.createdAt) > existing.lastActivity) {
            existing.lastActivity = new Date(r.createdAt);
          }
        } else {
          connectedServicesMap.set(r.serviceId, {
            serviceId: r.serviceId,
            serviceName: r.serviceName,
            supplierCount: 1,
            lastActivity: new Date(r.createdAt),
          });
        }
      });

      const connectedServices = Array.from(connectedServicesMap.values());

      // 알림 (최근 파트너십 요청 상태 변경, 정산 등)
      const notifications: Array<{ type: string; text: string; link: string }> = [];

      const recentMatchedRequests = partnershipRequests.filter(
        (r) => r.status === PartnershipStatus.MATCHED && r.matchedAt
      );
      if (recentMatchedRequests.length > 0) {
        notifications.push({
          type: 'success',
          text: `파트너십 매칭 완료 ${recentMatchedRequests.length}건`,
          link: '/partner/collaboration',
        });
      }

      if (openRequests > 0) {
        notifications.push({
          type: 'info',
          text: `진행 중인 파트너십 요청 ${openRequests}건`,
          link: '/partner/collaboration',
        });
      }

      return {
        stats: {
          totalRequests,
          openRequests,
          matchedRequests,
          closedRequests,
          connectedServiceCount: connectedServices.length,
          totalSupplierCount: sellerApprovals.length,
        },
        connectedServices: connectedServices.map((s) => ({
          ...s,
          lastActivity: this.formatRelativeTime(s.lastActivity),
        })),
        notifications,
      };
    } catch (error) {
      logger.error('[NetureDashboardService] Error fetching partner dashboard summary:', error);
      throw error;
    }
  }

  /**
   * 상대적 시간 포맷팅
   */
  private formatRelativeTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return `${days}일 전`;
  }

  /**
   * Seller Dashboard AI Insight — 4카드 구조
   *
   * WO-STORE-AI-V1-SELLER-INSIGHT
   */
  async getSellerDashboardInsight(sellerId: string) {
    try {
      // ① 접근 가능 상품
      const [accessibleRows, newThisWeekRows, notRequestedRows] = await Promise.all([
        AppDataSource.query(`
          SELECT COUNT(*)::int AS cnt
          FROM supplier_product_offers spo
          WHERE spo.is_active = true
            AND (
              spo.distribution_type = 'PUBLIC'
              OR (spo.distribution_type = 'PRIVATE' AND $1 = ANY(spo.allowed_seller_ids))
            )
        `, [sellerId]),
        AppDataSource.query(`
          SELECT COUNT(*)::int AS cnt
          FROM supplier_product_offers spo
          WHERE spo.is_active = true
            AND spo.created_at >= NOW() - INTERVAL '7 days'
            AND (
              spo.distribution_type = 'PUBLIC'
              OR (spo.distribution_type = 'PRIVATE' AND $1 = ANY(spo.allowed_seller_ids))
            )
        `, [sellerId]),
        AppDataSource.query(`
          SELECT COUNT(*)::int AS cnt
          FROM supplier_product_offers spo
          WHERE spo.is_active = true
            AND (
              spo.distribution_type = 'PUBLIC'
              OR (spo.distribution_type = 'PRIVATE' AND $1 = ANY(spo.allowed_seller_ids))
            )
            AND spo.id NOT IN (
              SELECT pa.offer_id FROM product_approvals pa
              WHERE pa.organization_id = $1 AND pa.approval_type = 'private'
            )
        `, [sellerId]),
      ]);

      const accessible = accessibleRows[0]?.cnt ?? 0;
      const newThisWeek = newThisWeekRows[0]?.cnt ?? 0;
      const notRequested = notRequestedRows[0]?.cnt ?? 0;

      // ② 공급 신청 상태 — WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: v2 product_approvals
      const [pendingRows, approvedRows, rejectedRows] = await Promise.all([
        AppDataSource.query(
          `SELECT COUNT(*)::int AS cnt FROM product_approvals WHERE organization_id = $1 AND approval_type = 'private' AND approval_status = 'pending'`,
          [sellerId],
        ),
        AppDataSource.query(
          `SELECT COUNT(*)::int AS cnt FROM product_approvals WHERE organization_id = $1 AND approval_type = 'private' AND approval_status = 'approved'`,
          [sellerId],
        ),
        AppDataSource.query(
          `SELECT COUNT(*)::int AS cnt FROM product_approvals WHERE organization_id = $1 AND approval_type = 'private' AND approval_status = 'rejected'`,
          [sellerId],
        ),
      ]);
      const pending = pendingRows[0]?.cnt ?? 0;
      const approved = approvedRows[0]?.cnt ?? 0;
      const rejected = rejectedRows[0]?.cnt ?? 0;

      // ③ 노출 점검 — Neture에 채널 시스템 없음, 향후 확장 대비 0 고정
      const approvedButNotExposed = 0;

      // ④ 운영 신호 — Neture에 주문 시스템 없음, 향후 서비스별 연동 시 확장
      const recentOrders7d = 0;
      const trend = 'none';

      return {
        products: {
          accessible,
          newThisWeek,
          notRequested,
          actionUrl: '/neture/seller/available-supply-products',
        },
        requests: {
          pending,
          approved,
          rejected,
          actionUrl: '/neture/seller/supply-requests',
        },
        exposure: {
          approvedButNotExposed,
          actionUrl: '/neture/seller/my-products',
        },
        operations: {
          recentOrders7d,
          trend,
          actionUrl: '/neture/seller/orders',
        },
      };
    } catch (error) {
      logger.error('[NetureDashboardService] Error fetching seller dashboard insight:', error);
      throw error;
    }
  }
}
