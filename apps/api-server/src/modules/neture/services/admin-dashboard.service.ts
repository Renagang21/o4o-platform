import type { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import logger from '../../../utils/logger.js';
import { NetureSupplier, SupplierProductOffer, SupplierStatus, OfferApprovalStatus, OfferDistributionType } from '../entities/index.js';

/** Platform-wide supplier, product and approval summaries; never supplier-scoped. */
export class NetureAdminDashboardService {
  private _supplierRepo?: Repository<NetureSupplier>;

  private get supplierRepo(): Repository<NetureSupplier> {
    if (!this._supplierRepo) this._supplierRepo = AppDataSource.getRepository(NetureSupplier);
    return this._supplierRepo;
  }

  private _offerRepo?: Repository<SupplierProductOffer>;

  private get offerRepo(): Repository<SupplierProductOffer> {
    if (!this._offerRepo) this._offerRepo = AppDataSource.getRepository(SupplierProductOffer);
    return this._offerRepo;
  }

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

      // 서비스별 공급자/승인 거래 조직 통계 (SERVICE + PRIVATE 모두 포함)
      const serviceStats: Array<{ serviceId: string; serviceName: string; suppliers: number; organizations: number }> = await AppDataSource.query(`
        SELECT pa.service_key AS "serviceId", pa.service_key AS "serviceName",
          COUNT(DISTINCT CASE WHEN pa.approval_status = 'approved' THEN spo.supplier_id END)::int AS suppliers,
          COUNT(DISTINCT CASE WHEN pa.approval_status = 'approved' THEN pa.organization_id END)::int AS organizations
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

      return {
        stats: {
          totalSuppliers,
          activeSuppliers,
          pendingSuppliers,
          totalRequests: adminReqStats.totalRequests,
          pendingRequests: adminReqStats.pendingRequests,
          approvedRequests: adminReqStats.approvedRequests,
          rejectedRequests: adminReqStats.rejectedRequests,
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
          organizations: s.organizations,
          status: 'active' as const,
        })),
        recentApplications: recentPending.map((r) => ({
          id: r.id,
          name: r.sellerId,
          type: '공급자 신청',
          date: r.createdAt,
          status: '대기중',
        })),
        recentActivities: [] as Array<{ id: string; type: string; text: string; time: Date }>,
      };
    } catch (error) {
      logger.error('[NetureDashboardService] Error fetching admin dashboard summary:', error);
      throw error;
    }
  }
}
