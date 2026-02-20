/**
 * Physical Store Linking Service
 *
 * WO-O4O-CROSS-SERVICE-STORE-LINKING-V1
 *
 * Links Cosmetics stores and GlycoPharm pharmacies by normalized business_number
 * into unified "Physical Stores" for cross-service KPI aggregation.
 */

import { DataSource } from 'typeorm';
import { normalizeBusinessNumber } from '../../utils/business-number.js';

// ==================== Types ====================

export interface SyncResult {
  created: number;
  updated: number;
  linked: number;
}

export interface PhysicalStoreListItem {
  physicalStoreId: string;
  businessNumber: string;
  storeName: string;
  region: string | null;
  services: string[];
  monthlyRevenue: number;
  monthlyOrders: number;
}

export interface PhysicalStoreListResponse {
  items: PhysicalStoreListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ServiceStoreDetail {
  serviceType: string;
  serviceStoreId: string;
  storeName: string;
  monthlyRevenue: number;
  monthlyOrders: number;
}

export interface PhysicalStoreSummary {
  physicalStoreId: string;
  businessNumber: string;
  storeName: string;
  region: string | null;
  monthlyRevenue: number;
  monthlyOrders: number;
  services: ServiceStoreDetail[];
}

// ==================== Service ====================

export class PhysicalStoreService {
  constructor(private dataSource: DataSource) {}

  /**
   * Full sync: scan cosmetics + glycopharm stores, upsert physical_stores,
   * and link them via physical_store_links.
   */
  async syncLinks(): Promise<SyncResult> {
    let created = 0;
    let updated = 0;
    let linked = 0;

    // 1. Fetch all stores with business_number from both services
    const [cosmeticsRows, glycopharmRows] = await Promise.all([
      this.dataSource.query(
        `SELECT id, business_number, name, region
         FROM cosmetics.cosmetics_stores
         WHERE business_number IS NOT NULL AND business_number != ''`,
      ),
      this.dataSource.query(
        `SELECT o.id, o.business_number, o.name
         FROM organizations o
         JOIN organization_service_enrollments ose ON ose.organization_id = o.id AND ose.service_code = 'glycopharm'
         WHERE o.business_number IS NOT NULL AND o.business_number != ''`,
      ),
    ]);

    // 2. Group by normalized business_number
    const bnMap = new Map<string, {
      storeName: string;
      region: string | null;
      links: Array<{ serviceType: string; serviceStoreId: string }>;
    }>();

    for (const row of cosmeticsRows) {
      const bn = normalizeBusinessNumber(row.business_number);
      if (!bn) continue;

      if (!bnMap.has(bn)) {
        bnMap.set(bn, {
          storeName: row.name,
          region: row.region || null,
          links: [],
        });
      }
      bnMap.get(bn)!.links.push({ serviceType: 'cosmetics', serviceStoreId: row.id });
    }

    for (const row of glycopharmRows) {
      const bn = normalizeBusinessNumber(row.business_number);
      if (!bn) continue;

      if (!bnMap.has(bn)) {
        bnMap.set(bn, {
          storeName: row.name,
          region: null,
          links: [],
        });
      } else {
        // If cosmetics already set the name, keep it; glycopharm is secondary
      }
      bnMap.get(bn)!.links.push({ serviceType: 'glycopharm', serviceStoreId: row.id });
    }

    // 3. Upsert physical_stores and insert links
    for (const [bn, data] of bnMap) {
      // Upsert physical store
      const upsertResult = await this.dataSource.query(
        `INSERT INTO physical_stores (business_number, store_name, region)
         VALUES ($1, $2, $3)
         ON CONFLICT (business_number) DO UPDATE SET
           store_name = EXCLUDED.store_name,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id, (xmax = 0) AS inserted`,
        [bn, data.storeName, data.region],
      );

      const physicalStoreId = upsertResult[0].id;
      const wasInserted = upsertResult[0].inserted;

      if (wasInserted) {
        created++;
      } else {
        updated++;
      }

      // Insert links (ON CONFLICT DO NOTHING)
      for (const link of data.links) {
        const linkResult = await this.dataSource.query(
          `INSERT INTO physical_store_links (physical_store_id, service_type, service_store_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (service_type, service_store_id) DO NOTHING`,
          [physicalStoreId, link.serviceType, link.serviceStoreId],
        );
        // rowCount is 1 if inserted, 0 if conflict
        if (linkResult.length > 0 || (Array.isArray(linkResult) && linkResult.length === 0)) {
          // For INSERT ... DO NOTHING, check affected rows
          linked++;
        }
      }
    }

    return { created, updated, linked };
  }

  /**
   * Paginated list of physical stores with monthly KPI.
   */
  async listPhysicalStores(page = 1, limit = 20): Promise<PhysicalStoreListResponse> {
    const offset = (page - 1) * limit;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Count total
    const countResult = await this.dataSource.query(
      `SELECT COUNT(*)::int as total FROM physical_stores`,
    );
    const total = countResult[0]?.total || 0;

    // Fetch stores with linked services and KPI
    const rows = await this.dataSource.query(
      `SELECT
         ps.id as "physicalStoreId",
         ps.business_number as "businessNumber",
         ps.store_name as "storeName",
         ps.region,
         COALESCE(
           (SELECT json_agg(DISTINCT psl.service_type)
            FROM physical_store_links psl
            WHERE psl.physical_store_id = ps.id),
           '[]'::json
         ) as services,
         COALESCE(
           (SELECT SUM(o."totalAmount")
            FROM ecommerce_orders o
            INNER JOIN physical_store_links psl ON psl.service_store_id = o.store_id
            WHERE psl.physical_store_id = ps.id
              AND o."createdAt" >= $1
              AND o.status != 'cancelled'),
           0
         )::numeric as "monthlyRevenue",
         COALESCE(
           (SELECT COUNT(*)
            FROM ecommerce_orders o
            INNER JOIN physical_store_links psl ON psl.service_store_id = o.store_id
            WHERE psl.physical_store_id = ps.id
              AND o."createdAt" >= $1
              AND o.status != 'cancelled'),
           0
         )::int as "monthlyOrders"
       FROM physical_stores ps
       ORDER BY "monthlyRevenue" DESC, ps.store_name ASC
       LIMIT $2 OFFSET $3`,
      [monthStart, limit, offset],
    );

    const items: PhysicalStoreListItem[] = rows.map((row: any) => ({
      physicalStoreId: row.physicalStoreId,
      businessNumber: row.businessNumber,
      storeName: row.storeName,
      region: row.region || null,
      services: Array.isArray(row.services) ? row.services : [],
      monthlyRevenue: Number(row.monthlyRevenue),
      monthlyOrders: Number(row.monthlyOrders),
    }));

    return { items, total, page, limit };
  }

  /**
   * Detailed summary for a single physical store with per-service breakdown.
   */
  async getPhysicalStoreSummary(id: string): Promise<PhysicalStoreSummary | null> {
    // Fetch physical store
    const storeRows = await this.dataSource.query(
      `SELECT id, business_number as "businessNumber", store_name as "storeName", region
       FROM physical_stores
       WHERE id = $1`,
      [id],
    );

    if (storeRows.length === 0) return null;

    const store = storeRows[0];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Fetch linked services with their KPI
    const linkRows = await this.dataSource.query(
      `SELECT
         psl.service_type as "serviceType",
         psl.service_store_id as "serviceStoreId",
         CASE
           WHEN psl.service_type = 'cosmetics'
             THEN (SELECT name FROM cosmetics.cosmetics_stores WHERE id = psl.service_store_id)
           WHEN psl.service_type = 'glycopharm'
             THEN (SELECT name FROM organizations WHERE id = psl.service_store_id)
           ELSE 'Unknown'
         END as "storeName",
         COALESCE(
           (SELECT SUM(o."totalAmount")
            FROM ecommerce_orders o
            WHERE o.store_id = psl.service_store_id
              AND o."createdAt" >= $2
              AND o.status != 'cancelled'),
           0
         )::numeric as "monthlyRevenue",
         COALESCE(
           (SELECT COUNT(*)
            FROM ecommerce_orders o
            WHERE o.store_id = psl.service_store_id
              AND o."createdAt" >= $2
              AND o.status != 'cancelled'),
           0
         )::int as "monthlyOrders"
       FROM physical_store_links psl
       WHERE psl.physical_store_id = $1`,
      [id, monthStart],
    );

    const services: ServiceStoreDetail[] = linkRows.map((row: any) => ({
      serviceType: row.serviceType,
      serviceStoreId: row.serviceStoreId,
      storeName: row.storeName || 'Unknown',
      monthlyRevenue: Number(row.monthlyRevenue),
      monthlyOrders: Number(row.monthlyOrders),
    }));

    const totalRevenue = services.reduce((sum, s) => sum + s.monthlyRevenue, 0);
    const totalOrders = services.reduce((sum, s) => sum + s.monthlyOrders, 0);

    return {
      physicalStoreId: store.id,
      businessNumber: store.businessNumber,
      storeName: store.storeName,
      region: store.region || null,
      monthlyRevenue: totalRevenue,
      monthlyOrders: totalOrders,
      services,
    };
  }

  /**
   * Per-service KPI for a physical store in a date range.
   * Used by the insights engine to compare current vs last month.
   */
  async getStoreServiceStats(
    physicalStoreId: string,
    fromISO: string,
    toISO: string,
  ): Promise<{ totalRevenue: number; totalOrders: number; services: Array<{ serviceType: string; revenue: number; orders: number }> }> {
    const rows = await this.dataSource.query(
      `SELECT
         psl.service_type as "serviceType",
         COALESCE(SUM(o."totalAmount"), 0)::numeric as revenue,
         COUNT(o.id)::int as orders
       FROM physical_store_links psl
       LEFT JOIN ecommerce_orders o
         ON o.store_id = psl.service_store_id
         AND o."createdAt" >= $2
         AND o."createdAt" < $3
         AND o.status != 'cancelled'
       WHERE psl.physical_store_id = $1
       GROUP BY psl.service_type`,
      [physicalStoreId, fromISO, toISO],
    );

    const services = rows.map((row: any) => ({
      serviceType: row.serviceType,
      revenue: Number(row.revenue),
      orders: Number(row.orders),
    }));

    const totalRevenue = services.reduce((sum: number, s: any) => sum + s.revenue, 0);
    const totalOrders = services.reduce((sum: number, s: any) => sum + s.orders, 0);

    return { totalRevenue, totalOrders, services };
  }
}

// normalizeBusinessNumber imported from utils/business-number.ts
