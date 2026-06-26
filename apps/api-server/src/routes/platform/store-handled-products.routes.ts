/**
 * Store Handled Products Routes — "매장 취급제품" 통합 조회 (read-only)
 *
 * WO-O4O-KPA-STORE-HANDLED-PRODUCTS-UNIFIED-VIEW-V1
 * 선행: IR-O4O-KPA-STORE-HANDLED-PRODUCTS-UNIFIED-VIEW-DESIGN-V1
 *
 * "매장 취급제품" = O4O 기반 제품(organization_product_listings) + 매장 경영활용 제품(store_local_products)
 * 두 소스를 물리 통합하지 않고 sourceType 으로 구분해 조회 통합한다(읽기 전용).
 *
 * API Namespace: /api/v1/store
 *   GET /handled-products  — 통합 목록(검색/출처필터/페이지네이션)
 *
 * WO-O4O-KPA-STORE-HANDLED-PRODUCTS-DISPLAY-POOL-SIMPLIFY-V1:
 *   제품 풀(매장 취급제품)은 채널 상태판이 아니다. 채널 상태(타블렛/온라인몰/상품설명) 컬럼·enrich 를 제거하고
 *   제품 풀 핵심 필드(이름/구분/표시가/상태/수정일)만 반환한다. 채널 노출은 각 채널 메뉴에서 관리.
 *   - 매장 경영활용 제품(local)의 온라인몰 미지원은 화면 하단 보조 안내로 고지(컬럼 아님).
 *
 * Boundary Policy: organization_id 필터 필수, Raw SQL parameter binding 필수.
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import type { AuthRequest } from '../../types/auth.js';
import { resolveStoreAccess } from '../../utils/store-owner.utils.js';

type AuthMiddleware = RequestHandler;

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

      // WO-O4O-KPA-STORE-HANDLED-PRODUCTS-DISPLAY-POOL-SIMPLIFY-V1:
      //   제품 풀(매장 취급제품)은 채널 상태판이 아니다. 화면에서 채널 상태 컬럼(타블렛/온라인몰/상품설명)을
      //   제거했으므로, 그를 위한 enrich 조인 3종(store_tablet_displays / organization_product_channels /
      //   shared_product_descriptions)도 함께 제거한다. 채널 노출은 각 채널 메뉴에서 관리한다.
      const now = Date.now();
      const items = rows.map((r) => {
        const isListing = r.source_type === 'listing';
        return {
          sourceType: r.source_type,
          sourceId: r.source_id,
          name: r.name || '(이름 없음)',
          imageUrl: r.image_url || null,
          originLabel: isListing ? 'O4O 기반 제품' : '매장 경영활용 제품',
          ownerLabel: isListing ? '공급/플랫폼' : '내 매장',
          price: r.price != null ? Number(r.price) : null,
          statusLabel: isListing ? listingStatusLabel(r, now) : r.is_active ? '활성' : '비활성',
          isActive: r.is_active,
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
