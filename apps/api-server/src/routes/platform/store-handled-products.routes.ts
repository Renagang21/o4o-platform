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
               (SELECT pi.image_url FROM product_images pi WHERE pi.master_id = opl.master_id AND pi.deleted_at IS NULL
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

      // WO-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-LINK-V1:
      //   현재 페이지 제품들의 연결 콘텐츠 수(linkedContentCount)를 1회 집계 쿼리로 조회(N+1 회피).
      //   UNION 본 쿼리는 건드리지 않고, 페이지 결과(source_id)에 대해서만 group count 한다.
      const linkCountMap = new Map<string, number>();
      if (rows.length > 0) {
        const pageSourceIds = rows.map((r) => r.source_id);
        const linkRows: Array<{ product_source_type: string; product_source_id: string; cnt: number }> =
          await dataSource.query(
            `SELECT product_source_type, product_source_id, COUNT(*)::int AS cnt
             FROM kpa_store_content_product_links
             WHERE organization_id = $1 AND product_source_id = ANY($2::uuid[])
             GROUP BY product_source_type, product_source_id`,
            [organizationId, pageSourceIds],
          );
        for (const lr of linkRows) {
          linkCountMap.set(`${lr.product_source_type}:${lr.product_source_id}`, lr.cnt);
        }
      }

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
          // WO-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-LINK-V1: 연결 콘텐츠 수(0 = 없음).
          linkedContentCount: linkCountMap.get(`${r.source_type}:${r.source_id}`) ?? 0,
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

  /**
   * POST /handled-products/remove
   * WO-O4O-KPA-STORE-HANDLED-PRODUCT-REMOVE-AND-STATUS-AUDIT-V1
   *
   * 선택 제품을 "매장 경영활용 제품 목록에서 제거"한다(상품 정보 삭제 아님).
   *   - listing: organization_product_listings 행 삭제(= 매장↔제품 경영활용 연결 해제).
   *              ProductMaster / 상세설명서(SPD) / 이미지 등 원본은 무접촉.
   *              organization_product_channels 는 FK ON DELETE CASCADE 로 함께 정리(채널 배치 해제).
   *   - local  : store_local_products 행 삭제.
   *   - 공통: 제품↔콘텐츠 연결(kpa_store_content_product_links)만 해제. 자료함 콘텐츠·QR 자체는 보존.
   * Body: { items: [{ sourceType: 'listing'|'local', sourceId: uuid }] } (1건/다건).
   * Boundary Policy: organization_id 필터 필수, parameter binding 필수.
   */
  router.post('/handled-products/remove', async (req: Request, res: Response): Promise<void> => {
    try {
      const auth = await getAuth();
      await new Promise<void>((resolve, reject) => {
        (auth as any)(req, res, (err: any) => (err ? reject(err) : resolve()));
      });

      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        res.status(403).json({ success: false, error: 'Store owner access required', code: 'FORBIDDEN' });
        return;
      }
      const userRoles: string[] = authReq.user?.roles || [];
      const organizationId = await resolveStoreAccess(dataSource, userId, userRoles);
      if (!organizationId) {
        res.status(403).json({ success: false, error: 'Store owner access required', code: 'FORBIDDEN' });
        return;
      }

      const UUID_RE = /^[0-9a-fA-F-]{36}$/;
      const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
      const valid = rawItems.filter(
        (it: any) =>
          it &&
          (it.sourceType === 'listing' || it.sourceType === 'local') &&
          typeof it.sourceId === 'string' &&
          UUID_RE.test(it.sourceId),
      ) as Array<{ sourceType: 'listing' | 'local'; sourceId: string }>;
      if (valid.length === 0) {
        res.status(400).json({ success: false, error: 'items(sourceType, sourceId) required', code: 'VALIDATION_ERROR' });
        return;
      }

      let removed = 0;
      const failed: Array<{ sourceType: string; sourceId: string; reason: string }> = [];
      for (const it of valid) {
        try {
          await dataSource.transaction(async (m) => {
            // 제품↔콘텐츠 연결만 해제(콘텐츠·QR 자체는 보존).
            await m.query(
              `DELETE FROM kpa_store_content_product_links
               WHERE organization_id = $1 AND product_source_type = $2 AND product_source_id = $3`,
              [organizationId, it.sourceType, it.sourceId],
            );
            const table = it.sourceType === 'listing' ? 'organization_product_listings' : 'store_local_products';
            const del: Array<{ id: string }> = await m.query(
              `DELETE FROM ${table} WHERE id = $1 AND organization_id = $2 RETURNING id`,
              [it.sourceId, organizationId],
            );
            if (del.length === 0) {
              const e: any = new Error('NOT_FOUND');
              e.code = 'NOT_FOUND';
              throw e;
            }
          });
          removed++;
        } catch (e: any) {
          failed.push({ sourceType: it.sourceType, sourceId: it.sourceId, reason: e?.code || e?.message || 'ERROR' });
        }
      }

      res.json({ success: true, data: { removed, failed } });
    } catch (error: any) {
      console.error('[StoreHandledProducts] POST /handled-products/remove error:', error);
      res.status(500).json({ success: false, error: 'Failed to remove handled products', code: 'INTERNAL_ERROR' });
    }
  });

  return router;
}
