import type { DataSource, Repository } from 'typeorm';
import { StoreAiSnapshot } from '../entities/store-ai-snapshot.entity.js';

/**
 * StoreAiSnapshotService — WO-O4O-STORE-HUB-AI-SUMMARY-V1
 *
 * 매장 KPI 데이터를 수집하여 store_ai_snapshots에 저장.
 * store-hub.controller.ts의 raw SQL 패턴 재사용.
 */
export class StoreAiSnapshotService {
  private snapshotRepo: Repository<StoreAiSnapshot>;

  constructor(private dataSource: DataSource) {
    this.snapshotRepo = dataSource.getRepository(StoreAiSnapshot);
  }

  /**
   * 오늘 날짜 기준 스냅샷 생성 또는 기존 반환 (dedup).
   */
  async createOrRefreshSnapshot(
    organizationId: string,
    periodDays = 7,
  ): Promise<StoreAiSnapshot> {
    const today = new Date().toISOString().slice(0, 10);

    // Dedup: 오늘 이미 스냅샷 있으면 반환
    const existing = await this.snapshotRepo.findOne({
      where: { organizationId, snapshotDate: today },
    });
    if (existing) {
      return existing;
    }

    // KPI 데이터 수집
    const data = await this.collectKpiData(organizationId, periodDays);

    const snapshot = this.snapshotRepo.create({
      organizationId,
      snapshotDate: today,
      periodDays,
      data,
    });

    return this.snapshotRepo.save(snapshot);
  }

  /**
   * 매장 KPI 데이터를 집계.
   */
  private async collectKpiData(
    organizationId: string,
    periodDays: number,
  ): Promise<Record<string, unknown>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    const startDateStr = startDate.toISOString();

    // 병렬 쿼리 실행
    const [orderStats, qrStats, productStats, channelStats] = await Promise.all([
      this.getOrderStats(organizationId, startDateStr),
      this.getQrStats(organizationId, startDateStr),
      this.getProductStats(organizationId),
      this.getChannelStats(organizationId),
    ]);

    return {
      periodDays,
      collectedAt: new Date().toISOString(),
      orders: orderStats,
      qrScans: qrStats,
      products: productStats,
      channels: channelStats,
    };
  }

  private async getOrderStats(organizationId: string, startDate: string) {
    try {
      const rows = await this.dataSource.query(
        `SELECT
           COUNT(*)::int AS total_orders,
           COALESCE(SUM(total_amount), 0)::numeric AS total_revenue,
           COALESCE(AVG(total_amount), 0)::numeric AS avg_order_value,
           COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END)::int AS today_orders,
           COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN total_amount END), 0)::numeric AS today_revenue
         FROM checkout_orders
         WHERE seller_organization_id = $1
           AND created_at >= $2`,
        [organizationId, startDate],
      );
      const r = rows[0] || {};
      return {
        totalOrders: r.total_orders || 0,
        totalRevenue: Number(r.total_revenue) || 0,
        avgOrderValue: Math.round(Number(r.avg_order_value) || 0),
        todayOrders: r.today_orders || 0,
        todayRevenue: Number(r.today_revenue) || 0,
      };
    } catch {
      return { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0, todayOrders: 0, todayRevenue: 0 };
    }
  }

  private async getQrStats(organizationId: string, startDate: string) {
    try {
      const rows = await this.dataSource.query(
        `SELECT
           COUNT(*)::int AS total_scans,
           COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END)::int AS today_scans
         FROM store_qr_scan_events
         WHERE organization_id = $1
           AND created_at >= $2`,
        [organizationId, startDate],
      );
      const r = rows[0] || {};
      return {
        totalScans: r.total_scans || 0,
        todayScans: r.today_scans || 0,
      };
    } catch {
      return { totalScans: 0, todayScans: 0 };
    }
  }

  private async getProductStats(organizationId: string) {
    try {
      const rows = await this.dataSource.query(
        `SELECT
           COUNT(*)::int AS total_products,
           COUNT(CASE WHEN is_active = true THEN 1 END)::int AS active_products,
           service_key,
           COUNT(*)::int AS cnt
         FROM organization_product_listings
         WHERE organization_id = $1
         GROUP BY service_key`,
        [organizationId],
      );

      const byService: Record<string, number> = {};
      let total = 0;
      let active = 0;
      for (const row of rows) {
        byService[row.service_key] = row.cnt;
        total += row.cnt;
        active += row.active_products || 0;
      }
      return { totalProducts: total, activeProducts: active, byService };
    } catch {
      return { totalProducts: 0, activeProducts: 0, byService: {} };
    }
  }

  private async getChannelStats(organizationId: string) {
    try {
      const rows = await this.dataSource.query(
        `SELECT
           channel_type,
           status,
           COUNT(*)::int AS cnt
         FROM organization_channels
         WHERE organization_id = $1
         GROUP BY channel_type, status`,
        [organizationId],
      );

      const channels: Array<{ type: string; status: string; count: number }> = [];
      let activeCount = 0;
      for (const row of rows) {
        channels.push({ type: row.channel_type, status: row.status, count: row.cnt });
        if (row.status === 'active') activeCount += row.cnt;
      }
      return { activeChannels: activeCount, details: channels };
    } catch {
      return { activeChannels: 0, details: [] };
    }
  }
}
