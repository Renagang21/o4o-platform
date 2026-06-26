/**
 * Store Handled Products Routes — "매장 취급제품" 통합 조회 (read-only)
 *
 * WO-O4O-KPA-STORE-HANDLED-PRODUCTS-UNIFIED-VIEW-V1
 * 선행: IR-O4O-KPA-STORE-HANDLED-PRODUCTS-UNIFIED-VIEW-DESIGN-V1
 *
 * "매장 취급제품" = O4O 취급 제품(organization_product_listings) + 매장 자체 제품(store_local_products)
 * 두 소스를 물리 통합하지 않고 sourceType 으로 구분해 조회 통합한다(읽기 전용).
 *
 * API Namespace: /api/v1/store
 *   GET /handled-products  — 통합 목록(검색/출처필터/페이지네이션 + 채널상태 3종)
 *
 * 채널 상태(V1 신뢰 표시): 타블렛(both) / 온라인몰(listing only) / 상품설명(listing only).
 *   - 매장 자체 제품(local)의 온라인몰·상품설명은 구조적으로 미지원 → 'not_supported' 고정.
 *     (store_local_products 는 Display Domain — ecommerce/channel 교차 차단, migration 20260224300000)
 *
 * Boundary Policy: organization_id 필터 필수, Raw SQL parameter binding 필수.
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import type { AuthRequest } from '../../types/auth.js';
import { resolveStoreAccess } from '../../utils/store-owner.utils.js';

type AuthMiddleware = RequestHandler;

type TabletExposure = 'exposed' | 'partial' | 'not_exposed';
type OnlineExposure = 'exposed' | 'inactive' | 'not_exposed' | 'not_supported';
type DescriptionStatus = 'available' | 'none' | 'not_supported';

interface UnifiedRow {
  source_type: 'listing' | 'local';
  source_id: string;
  name: string | null;
  image_url: string | null;
  price: string | number | null;
  is_active: boolean;
  listing_status: string | null;
  start_at: string | null;
  end_at: string | null;
  master_id: string | null;
  updated_at: string;
}

function listingStatusLabel(row: UnifiedRow, now: number): string {
  if (!row.is_active) return '비활성';
  const s = (row.listing_status || '').toLowerCase();
  if (s === 'pending') return '승인 대기';
  if (s === 'canceled' || s === 'cancelled' || s === 'rejected') return '중지';
  const start = row.start_at ? new Date(row.start_at).getTime() : null;
  const end = row.end_at ? new Date(row.end_at).getTime() : null;
  if ((start && start <= now) && (!end || end >= now) && (start || end)) return '이벤트';
  return '활성';
}

export function createStoreHandledProductsRoutes(dataSource: DataSource): Router {
  const router = Router();

  let requireAuth: AuthMiddleware;
  async function getAuth(): Promise<AuthMiddleware> {
    if (!requireAuth) {
      const mod = await import('../../middleware/auth.middleware.js');
      requireAuth = mod.requireAuth as AuthMiddleware;
    }
    return requireAuth;
  }

  /**
   * GET /handled-products
   * Query: page, limit, search, source(all|listing|local)
   */
  router.get('/handled-products', async (req: Request, res: Response): Promise<void> => {
    try {
      const auth = await getAuth();
      await new Promise<void>((resolve, reject) => {
        (auth as any)(req, res, (err: any) => (err ? reject(err) : resolve()));
      });

      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        res.status(403).json({ success: false, error: 'Store owner or operator role required', code: 'FORBIDDEN' });
        return;
      }
      const userRoles: string[] = authReq.user?.roles || [];
      const organizationId = await resolveStoreAccess(dataSource, userId, userRoles);
      if (!organizationId) {
        res.json({ success: true, data: { items: [], pagination: { page: 1, limit: 20, total: 0 } } });
        return;
      }

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;
      const search = ((req.query.search as string) || '').trim();
      const sourceParam = (req.query.source as string) || 'all';
      const includeListing = sourceParam !== 'local';
      const includeLocal = sourceParam !== 'listing';

      // ── 공통 파라미터 ($1=org, $2=search) ──
      const baseParams: any[] = [organizationId];
      const hasSearch = search.length > 0;
      if (hasSearch) baseParams.push(`%${search}%`);
      const searchListing = hasSearch ? ` AND pm.name ILIKE $2` : '';
      const searchLocal = hasSearch ? ` AND lp.name ILIKE $2` : '';

      const listingSelect = `
        SELECT 'listing'::text AS source_type, opl.id AS source_id, pm.name AS name,
               (SELECT pi.image_url FROM product_images pi WHERE pi.master_id = opl.master_id
                 ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1) AS image_url,
               COALESCE(opl.price, spo.price_general) AS price,
               opl.is_active AS is_active, opl.status AS listing_status,
               opl.start_at AS start_at, opl.end_at AS end_at, opl.master_id AS master_id,
               opl.updated_at AS updated_at
        FROM organization_product_listings opl
        LEFT JOIN product_masters pm ON pm.id = opl.master_id
        LEFT JOIN supplier_product_offers spo ON spo.id = opl.offer_id
        WHERE opl.organization_id = $1 AND opl.is_active = true${searchListing}`;

      const localSelect = `
        SELECT 'local'::text AS source_type, lp.id AS source_id, lp.name AS name,
               lp.thumbnail_url AS image_url,
               lp.price_display AS price,
               lp.is_active AS is_active, NULL::varchar AS listing_status,
               NULL::timestamp AS start_at, NULL::timestamp AS end_at, NULL::uuid AS master_id,
               lp.updated_at AS updated_at
        FROM store_local_products lp
        WHERE lp.organization_id = $1 AND lp.is_active = true${searchLocal}`;

      const selects: string[] = [];
      if (includeListing) selects.push(listingSelect);
      if (includeLocal) selects.push(localSelect);
      if (selects.length === 0) {
        res.json({ success: true, data: { items: [], pagination: { page, limit, total: 0 } } });
        return;
      }
      const unionSql = selects.join('\n        UNION ALL\n');

      const dataSql = `WITH unified AS (${unionSql})
        SELECT * FROM unified ORDER BY updated_at DESC NULLS LAST
        LIMIT $${baseParams.length + 1} OFFSET $${baseParams.length + 2}`;
      const countSql = `WITH unified AS (${unionSql}) SELECT count(*)::int AS total FROM unified`;

      const [rows, countRes]: [UnifiedRow[], { total: number }[]] = await Promise.all([
        dataSource.query(dataSql, [...baseParams, limit, offset]),
        dataSource.query(countSql, baseParams),
      ]);
      const total = countRes[0]?.total ?? 0;

      // ── 채널 상태 enrich (현재 페이지 한정) ──
      const listingIds = rows.filter((r) => r.source_type === 'listing').map((r) => r.source_id);
      const localIds = rows.filter((r) => r.source_type === 'local').map((r) => r.source_id);
      const masterIds = rows
        .filter((r) => r.source_type === 'listing' && r.master_id)
        .map((r) => r.master_id as string);

      const tabletMap = new Map<string, number>(); // `${type}:${id}` → tablet_count
      const onlineMap = new Map<string, boolean>(); // listingId → active?
      const descSet = new Set<string>(); // masterId with visible description
      let totalTablets = 0;

      if (listingIds.length > 0 || localIds.length > 0) {
        const [tabletRows, totalTabletRows] = await Promise.all([
          dataSource.query(
            `SELECT std.product_type, std.product_id, count(DISTINCT std.tablet_id)::int AS cnt
             FROM store_tablet_displays std
             JOIN store_tablets st ON st.id = std.tablet_id
             WHERE st.organization_id = $1 AND std.is_visible = true
               AND ( (std.product_type = 'supplier' AND std.product_id = ANY($2::uuid[]))
                  OR (std.product_type = 'local'    AND std.product_id = ANY($3::uuid[])) )
             GROUP BY std.product_type, std.product_id`,
            [organizationId, listingIds.length ? listingIds : ['00000000-0000-0000-0000-000000000000'],
              localIds.length ? localIds : ['00000000-0000-0000-0000-000000000000']],
          ),
          dataSource.query(`SELECT count(*)::int AS total FROM store_tablets WHERE organization_id = $1`, [organizationId]),
        ]);
        totalTablets = totalTabletRows[0]?.total ?? 0;
        for (const t of tabletRows as { product_type: string; product_id: string; cnt: number }[]) {
          const key = `${t.product_type === 'supplier' ? 'listing' : 'local'}:${t.product_id}`;
          tabletMap.set(key, t.cnt);
        }
      }

      if (listingIds.length > 0) {
        const onlineRows = await dataSource.query(
          `SELECT opc.product_listing_id AS id, bool_or(opc.is_active) AS active
           FROM organization_product_channels opc
           JOIN organization_channels oc ON oc.id = opc.channel_id
           WHERE oc.organization_id = $1 AND oc.channel_type = 'B2C'
             AND opc.product_listing_id = ANY($2::uuid[])
           GROUP BY opc.product_listing_id`,
          [organizationId, listingIds],
        );
        for (const o of onlineRows as { id: string; active: boolean }[]) onlineMap.set(o.id, !!o.active);
      }

      if (masterIds.length > 0) {
        const descRows = await dataSource.query(
          `SELECT master_id FROM shared_product_descriptions
           WHERE master_id = ANY($1::uuid[]) AND status <> 'hidden'
           GROUP BY master_id`,
          [masterIds],
        );
        for (const d of descRows as { master_id: string }[]) descSet.add(d.master_id);
      }

      const now = Date.now();
      const items = rows.map((r) => {
        const isListing = r.source_type === 'listing';

        // 타블렛 노출
        const tabletCnt = tabletMap.get(`${r.source_type}:${r.source_id}`) ?? 0;
        let tabletExposure: TabletExposure = 'not_exposed';
        if (tabletCnt > 0) tabletExposure = totalTablets > 0 && tabletCnt >= totalTablets ? 'exposed' : 'partial';

        // 온라인몰 노출
        let onlineSalesExposure: OnlineExposure = 'not_supported';
        if (isListing) {
          if (onlineMap.has(r.source_id)) onlineSalesExposure = onlineMap.get(r.source_id) ? 'exposed' : 'inactive';
          else onlineSalesExposure = 'not_exposed';
        }

        // 상품설명
        let productDescriptionStatus: DescriptionStatus = 'not_supported';
        if (isListing) productDescriptionStatus = r.master_id && descSet.has(r.master_id) ? 'available' : 'none';

        return {
          sourceType: r.source_type,
          sourceId: r.source_id,
          name: r.name || '(이름 없음)',
          imageUrl: r.image_url || null,
          originLabel: isListing ? 'O4O 취급 제품' : '매장 자체 제품',
          ownerLabel: isListing ? '공급/플랫폼' : '내 매장',
          price: r.price != null ? Number(r.price) : null,
          statusLabel: isListing ? listingStatusLabel(r, now) : r.is_active ? '활성' : '비활성',
          isActive: r.is_active,
          tabletExposure,
          onlineSalesExposure,
          productDescriptionStatus,
          updatedAt: r.updated_at,
          managePath: isListing
            ? `/store/my-products?highlight=${r.source_id}`
            : `/store/commerce/local-products?highlight=${r.source_id}`,
        };
      });

      res.json({ success: true, data: { items, pagination: { page, limit, total } } });
    } catch (error: any) {
      console.error('[StoreHandledProducts] GET /handled-products error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch handled products', code: 'INTERNAL_ERROR' });
    }
  });

  return router;
}
