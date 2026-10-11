import { AppDataSource } from '../../../database/connection.js';
import logger from '../../../utils/logger.js';

/** Store-owner product access and private-supply insights. Seller is not Supplier. */
export class NetureSellerDashboardService {
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

      // WO-O4O-NETURE-SUPPLIER-BACKEND-LEGACY-SHELL-AND-NOTIFICATION-FINAL-RETIREMENT-V1:
      // seller(=매장 경영자, store_owner) actionUrl 정본화. 기존 `/neture/seller/*` 는 API 경로 형태로
      // 프론트 route 가 아니어서(현재 어떤 네비게이션도 소비하지 않아 런타임 데드링크는 없음) latent 정합만 교정.
      // seller≠supplier 이므로 `/supplier/*` 로 옮기지 않고 seller scope 의 canonical `/store/*`(MainLayout, backend-gated)로 정렬한다.
      // 전용 상세 페이지가 없는 requests 는 가장 가까운 canonical 목록(/store/manage/products)로 연결.
      return {
        products: {
          accessible,
          newThisWeek,
          notRequested,
          actionUrl: '/store/manage/products/library',
        },
        requests: {
          pending,
          approved,
          rejected,
          actionUrl: '/store/manage/products',
        },
        exposure: {
          approvedButNotExposed,
          actionUrl: '/store/my-products',
        },
        operations: {
          recentOrders7d,
          trend,
          actionUrl: '/store/orders',
        },
      };
    } catch (error) {
      logger.error('[NetureDashboardService] Error fetching seller dashboard insight:', error);
      throw error;
    }
  }
}
