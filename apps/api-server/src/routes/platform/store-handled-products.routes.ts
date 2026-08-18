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
// WO-O4O-KPA-STORE-PRODUCT-QR-ALWAYS-AVAILABLE-V1: 상품 기준 고정 QR(ProductMaster Landing) — 다국어 무관 항상 발급.
import { ProductLandingService } from '../../modules/neture/services/product-landing.service.js';
// WO-O4O-KPA-STORE-PRODUCT-QR-DOWNLOAD-AND-PRINT-SIZE-V1: PNG/SVG/PDF export (지정 mm 라벨 PDF)
import { generateQrPng, generateQrSvg, generateProductQrLabelPdf } from '../../services/qr-print.service.js';
// WO-O4O-KPA-STORE-HANDLED-PRODUCT-CATEGORY-COLUMN-V1: O4O 표준 분류(규제유형+의약품분류 → 표시 분류) SSOT 재사용
// WO-PHARMACY-HUB-STORE-HANDLED-PRODUCTS-V1:
//   조회·해제 로직을 services/store/store-handled-products.service.ts 로 추출했다.
//   이 라우트는 인증·조직 결정(공통 resolveStoreAccess — 무변경)과 응답 매핑만 담당한다.
//   Pharmacy-Hub 는 같은 service 함수를 쓰되 조직만 PH enrollment 기준으로 해석한다.
// WO-O4O-STORE-OWNER-BACKCOMPAT-SERVICEKEY-MIGRATION-V1 §3:
//   `/api/v1/store/handled-products` 의 소비처는 services/web-kpa-society 뿐이다.
//   Pharmacy-Hub 는 별도 라우터(`/api/v1/pharmacy-hub/store-owner/handled-products`)를 쓴다.
//   따라서 조직 결정을 serviceKey='kpa' 로 고정해 타 서비스 조직 선택을 차단한다.
import {
  listHandledProducts,
  removeHandledProducts,
  parseHandledProductRefs,
} from '../../services/store/store-handled-products.service.js';

type AuthMiddleware = RequestHandler;

// WO-O4O-KPA-STORE-NEW-PRODUCT-REQUEST-AND-ADMIN-APPROVAL-V1 (P3 cleanup):
//   '승인 대기' 표시 제거. organization_product_listings.status 기본값 'pending'(Neture Distribution
//   잔재)에서 유래했으나, 매장 경영활용 제품 목록은 이미 등록·사용 가능한 제품 풀이므로 유통 승인 상태를
//   상태로 노출하지 않는다(실제 게이트 아님, is_active 로 충분). statusLabel 필드·listingStatusLabel 제거.

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
      const organizationId = await resolveStoreAccess(dataSource, userId, userRoles, 'kpa');
      if (!organizationId) {
        res.json({ success: true, data: { items: [], pagination: { page: 1, limit: 20, total: 0 } } });
        return;
      }

      // 조회 계약(UNION·검색·분류 파생·기본 managePath)은 공통 service 함수가 SSOT 다.
      const data = await listHandledProducts(dataSource, organizationId, {
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        source: req.query.source,
      });

      res.json({ success: true, data });
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
      const organizationId = await resolveStoreAccess(dataSource, userId, userRoles, 'kpa');
      if (!organizationId) {
        res.status(403).json({ success: false, error: 'Store owner access required', code: 'FORBIDDEN' });
        return;
      }

      const valid = parseHandledProductRefs(req.body?.items);
      if (valid.length === 0) {
        res.status(400).json({ success: false, error: 'items(sourceType, sourceId) required', code: 'VALIDATION_ERROR' });
        return;
      }

      const data = await removeHandledProducts(dataSource, organizationId, valid);
      res.json({ success: true, data });
    } catch (error: any) {
      console.error('[StoreHandledProducts] POST /handled-products/remove error:', error);
      res.status(500).json({ success: false, error: 'Failed to remove handled products', code: 'INTERNAL_ERROR' });
    }
  });

  /**
   * GET /handled-products/qr?sourceType=listing&sourceId=<uuid>
   * WO-O4O-KPA-STORE-PRODUCT-QR-ALWAYS-AVAILABLE-V1
   *
   * 매장 취급제품의 "상품 QR" — 다국어 콘텐츠 존재 여부와 무관하게 **항상** 사용 가능.
   *   - QR 은 ProductMaster 기준 고정 Landing(/p/{publicKey}) — 없으면 idempotent 발급(모든 master 커버).
   *     같은 상품이면 콘텐츠 변경 후에도 동일 QR 유지(listing 재등록으로 id 가 바뀌어도 master 기준이라 안정).
   *   - languages = 해당 master 의 canonical STORE 상세설명서 언어(제공 언어). 없으면 [](QR 은 그대로 사용).
   * Boundary: organization_id 로 listing 소유 검증. parameter binding.
   * (local 은 master 가 없어 상품 QR 대상 아님 — UI 목록에서도 listing 만 노출)
   */
  router.get('/handled-products/qr', async (req: Request, res: Response): Promise<void> => {
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
      const organizationId = await resolveStoreAccess(dataSource, userId, authReq.user?.roles || [], 'kpa');
      if (!organizationId) {
        res.status(403).json({ success: false, error: 'Store owner access required', code: 'FORBIDDEN' });
        return;
      }

      const UUID_RE = /^[0-9a-fA-F-]{36}$/;
      const sourceType = String(req.query.sourceType || '');
      const sourceId = String(req.query.sourceId || '');
      if (sourceType !== 'listing' || !UUID_RE.test(sourceId)) {
        res.status(400).json({ success: false, error: 'sourceType=listing & valid sourceId required', code: 'VALIDATION_ERROR' });
        return;
      }

      // org 소유 listing → master 확인
      const rows: Array<{ master_id: string | null }> = await dataSource.query(
        `SELECT master_id FROM organization_product_listings WHERE id = $1 AND organization_id = $2 LIMIT 1`,
        [sourceId, organizationId],
      );
      if (!rows[0]) {
        res.status(404).json({ success: false, error: 'O4O 제품을 현재 매장에서 찾을 수 없습니다.', code: 'LISTING_NOT_FOUND' });
        return;
      }
      const masterId = rows[0].master_id;
      if (!masterId) {
        // master 없는 listing(예외) — QR 발급 불가.
        res.json({ success: true, data: { qr: null, languages: [], reason: 'NO_MASTER' } });
        return;
      }

      // 상품 기준 고정 Landing QR (없으면 idempotent 발급)
      const landingSvc = new ProductLandingService(dataSource);
      const qr = await landingSvc.getLandingQr(masterId, 320);

      // 제공 언어 = 해당 master 의 canonical STORE 상세설명서 언어(랜딩이 노출하는 콘텐츠 기준)
      const langRows: Array<{ language: string | null }> = await dataSource.query(
        `SELECT DISTINCT language FROM shared_product_descriptions
         WHERE master_id = $1 AND description_type = 'STORE' AND status = 'canonical' AND deleted_at IS NULL`,
        [masterId],
      );
      const languages = langRows.map((r) => r.language).filter((l): l is string => !!l);

      res.json({
        success: true,
        data: { qr: { publicKey: qr.publicKey, url: qr.url, svg: qr.svg }, languages },
      });
    } catch (error: any) {
      console.error('[StoreHandledProducts] GET /handled-products/qr error:', error);
      res.status(500).json({ success: false, error: 'Failed to build product QR', code: 'INTERNAL_ERROR' });
    }
  });

  /**
   * GET /handled-products/qr/export?sourceType=listing&sourceId=<uuid>&format=png|svg|pdf&sizeMm=NN
   * WO-O4O-KPA-STORE-PRODUCT-QR-DOWNLOAD-AND-PRINT-SIZE-V1
   *
   * 상품 QR 을 용도별 파일로 내보낸다(같은 상품 기준 고정 QR = /p/{key}, 데이터 재생성 아님):
   *   - png : 고해상 래스터(일반 이미지) · svg : 벡터(확대/편집) · pdf : 지정 mm 라벨(바로 인쇄)
   * 파일명은 프론트가 상품명 기준으로 지정한다(Content-Disposition 미의존).
   */
  router.get('/handled-products/qr/export', async (req: Request, res: Response): Promise<void> => {
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
      const organizationId = await resolveStoreAccess(dataSource, userId, authReq.user?.roles || [], 'kpa');
      if (!organizationId) {
        res.status(403).json({ success: false, error: 'Store owner access required', code: 'FORBIDDEN' });
        return;
      }

      const UUID_RE = /^[0-9a-fA-F-]{36}$/;
      const sourceType = String(req.query.sourceType || '');
      const sourceId = String(req.query.sourceId || '');
      const format = String(req.query.format || 'png').toLowerCase();
      const sizeMm = Math.min(Math.max(parseInt(String(req.query.sizeMm ?? '50'), 10) || 50, 15), 200);
      if (sourceType !== 'listing' || !UUID_RE.test(sourceId) || !['png', 'svg', 'pdf'].includes(format)) {
        res.status(400).json({ success: false, error: 'sourceType=listing, valid sourceId, format=png|svg|pdf required', code: 'VALIDATION_ERROR' });
        return;
      }

      const rows: Array<{ master_id: string | null; name: string | null }> = await dataSource.query(
        `SELECT opl.master_id, pm.name
         FROM organization_product_listings opl
         LEFT JOIN product_masters pm ON pm.id = opl.master_id
         WHERE opl.id = $1 AND opl.organization_id = $2 LIMIT 1`,
        [sourceId, organizationId],
      );
      if (!rows[0]) {
        res.status(404).json({ success: false, error: 'O4O 제품을 현재 매장에서 찾을 수 없습니다.', code: 'LISTING_NOT_FOUND' });
        return;
      }
      const masterId = rows[0].master_id;
      if (!masterId) {
        res.status(400).json({ success: false, error: '기준 상품 정보가 없어 QR 을 발급할 수 없습니다.', code: 'NO_MASTER' });
        return;
      }
      const name = rows[0].name || '상품';

      const landingSvc = new ProductLandingService(dataSource);
      const { url } = await landingSvc.getLandingQr(masterId, 320);

      if (format === 'svg') {
        const svg = await generateQrSvg(url, 1024, 4);
        res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
        res.send(svg);
        return;
      }
      if (format === 'png') {
        const png = await generateQrPng(url, 1024, 4);
        res.setHeader('Content-Type', 'image/png');
        res.send(png);
        return;
      }
      // pdf — 제공 언어 포함 라벨(지정 mm)
      const langRows: Array<{ language: string | null }> = await dataSource.query(
        `SELECT DISTINCT language FROM shared_product_descriptions
         WHERE master_id = $1 AND description_type = 'STORE' AND status = 'canonical' AND deleted_at IS NULL`,
        [masterId],
      );
      const languages = langRows.map((r) => r.language).filter((l): l is string => !!l);
      const pdf = await generateProductQrLabelPdf({ url, name, languages, sizeMm });
      res.setHeader('Content-Type', 'application/pdf');
      res.send(pdf);
    } catch (error: any) {
      console.error('[StoreHandledProducts] GET /handled-products/qr/export error:', error);
      res.status(500).json({ success: false, error: 'Failed to export product QR', code: 'INTERNAL_ERROR' });
    }
  });

  return router;
}
