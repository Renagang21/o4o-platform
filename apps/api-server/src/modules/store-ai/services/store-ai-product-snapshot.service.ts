import type { DataSource, Repository } from 'typeorm';
import { StoreAiProductSnapshot } from '../entities/store-ai-product-snapshot.entity.js';

/**
 * StoreAiProductSnapshotService — WO-O4O-PRODUCT-STORE-AI-INSIGHT-V1
 *
 * 상품별 KPI 데이터를 수집하여 store_ai_product_snapshots에 저장.
 * 데이터 소스:
 *   - QR 스캔: product_marketing_assets → store_qr_scan_events
 *   - 주문/매출: checkout_orders.items JSONB
 *   - 상품명: organization_product_listings → supplier_product_offers → product_masters
 */
export class StoreAiProductSnapshotService {
  private snapshotRepo: Repository<StoreAiProductSnapshot>;

  constructor(private dataSource: DataSource) {
    this.snapshotRepo = dataSource.getRepository(StoreAiProductSnapshot);
  }

  /**
   * 오늘 날짜 기준 상품별 스냅샷 생성 또는 기존 반환 (dedup).
   */
  async createOrRefreshSnapshots(
    organizationId: string,
    periodDays = 7,
  ): Promise<StoreAiProductSnapshot[]> {
    const today = new Date().toISOString().slice(0, 10);

    // Dedup: 오늘 이미 스냅샷 있으면 반환
    const existing = await this.snapshotRepo.find({
      where: { organizationId, snapshotDate: today },
    });
    if (existing.length > 0) {
      return existing;
    }

    // 상품별 KPI 데이터 수집
    const products = await this.collectProductKpi(organizationId, periodDays);

    if (products.length === 0) {
      return [];
    }

    // 배치 저장
    const snapshots = products.map((p) =>
      this.snapshotRepo.create({
        organizationId,
        productId: p.productId,
        productName: p.productName,
        snapshotDate: today,
        periodDays,
        qrScans: p.qrScans,
        orders: p.orders,
        revenue: p.revenue,
        conversionRate: p.qrScans > 0 ? Math.round((p.orders / p.qrScans) * 10000) / 100 : 0,
        contentViews: 0, // 미래 확장
        signageViews: 0, // 미래 확장
      }),
    );

    return this.snapshotRepo.save(snapshots);
  }

  /**
   * 상품별 KPI 데이터를 집계.
   */
  private async collectProductKpi(
    organizationId: string,
    periodDays: number,
  ): Promise<Array<{
    productId: string;
    productName: string;
    qrScans: number;
    orders: number;
    revenue: number;
  }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    const startDateStr = startDate.toISOString();

    // 병렬 쿼리 실행
    const [productList, qrByProduct, ordersByProduct] = await Promise.all([
      this.getProductList(organizationId),
      this.getQrScansByProduct(organizationId, startDateStr),
      this.getOrdersByProduct(organizationId, startDateStr),
    ]);

    // 상품 목록 기준으로 KPI 병합
    const qrMap = new Map(qrByProduct.map((r) => [r.productId, r.qrScans]));
    const orderMap = new Map(ordersByProduct.map((r) => [r.productId, r]));

    return productList.map((p) => {
      const orderData = orderMap.get(p.productId);
      return {
        productId: p.productId,
        productName: p.productName,
        qrScans: qrMap.get(p.productId) || 0,
        orders: orderData?.orders || 0,
        revenue: orderData?.revenue || 0,
      };
    });
  }

  /**
   * 활성 상품 목록 조회 (상품명 포함).
   */
  private async getProductList(
    organizationId: string,
  ): Promise<Array<{ productId: string; productName: string }>> {
    try {
      const rows = await this.dataSource.query(
        `SELECT
           opl.offer_id AS product_id,
           COALESCE(pm.name, pm.regulatory_name, 'Unknown') AS product_name
         FROM organization_product_listings opl
         LEFT JOIN supplier_product_offers spo ON spo.id = opl.offer_id
         LEFT JOIN product_masters pm ON pm.id = spo.product_master_id
         WHERE opl.organization_id = $1 AND opl.is_active = true
         ORDER BY pm.name ASC
         LIMIT 100`,
        [organizationId],
      );
      return rows.map((r: any) => ({
        productId: r.product_id,
        productName: r.product_name,
      }));
    } catch {
      return [];
    }
  }

  /**
   * 상품별 QR 스캔 수 조회 (product_marketing_assets → store_qr_scan_events).
   */
  private async getQrScansByProduct(
    organizationId: string,
    startDate: string,
  ): Promise<Array<{ productId: string; qrScans: number }>> {
    try {
      const rows = await this.dataSource.query(
        `SELECT
           pma.product_id,
           COUNT(sqe.id)::int AS qr_scans
         FROM product_marketing_assets pma
         LEFT JOIN store_qr_scan_events sqe
           ON sqe.qr_code_id = pma.asset_id
           AND sqe.organization_id = pma.organization_id
           AND sqe.created_at >= $2
         WHERE pma.organization_id = $1
           AND pma.asset_type = 'qr'
         GROUP BY pma.product_id`,
        [organizationId, startDate],
      );
      return rows.map((r: any) => ({
        productId: r.product_id,
        qrScans: r.qr_scans || 0,
      }));
    } catch {
      return [];
    }
  }

  /**
   * 상품별 주문수/매출 조회 (checkout_orders.items JSONB).
   */
  private async getOrdersByProduct(
    organizationId: string,
    startDate: string,
  ): Promise<Array<{ productId: string; orders: number; revenue: number }>> {
    try {
      const rows = await this.dataSource.query(
        `SELECT
           item->>'productId' AS product_id,
           COUNT(DISTINCT co.id)::int AS orders,
           COALESCE(SUM((item->>'subtotal')::numeric), 0)::numeric AS revenue
         FROM checkout_orders co,
           jsonb_array_elements(co.items) AS item
         WHERE co.seller_organization_id = $1
           AND co.created_at >= $2
         GROUP BY item->>'productId'`,
        [organizationId, startDate],
      );
      return rows.map((r: any) => ({
        productId: r.product_id,
        orders: r.orders || 0,
        revenue: Number(r.revenue) || 0,
      }));
    } catch {
      return [];
    }
  }
}
