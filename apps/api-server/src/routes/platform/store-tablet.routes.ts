/**
 * Store Tablet Routes — Tablet Device & Display Management + Interest Requests
 *
 * WO-STORE-LOCAL-PRODUCT-DISPLAY-V1
 * WO-O4O-TABLET-MODULE-V1
 * WO-O4O-TABLET-IDLE-PLAYLIST-EDITOR-V1: idle playlist 편집 API 추가
 *
 * Tablet은 상품을 "소유"하지 않는다. 상품을 "선택하여 진열"한다.
 * 상품 풀: supplier (organization_product_listings) + local (store_local_products)
 *
 * API Namespace: /api/v1/store
 *
 * ┌──────────────────────────────────────────────────────────┐
 * │ AUTHENTICATED (requireAuth + pharmacy owner)             │
 * │  GET    /tablets                     — 태블릿 목록       │
 * │  POST   /tablets                     — 태블릿 등록       │
 * │  PUT    /tablets/:id                 — 태블릿 수정       │
 * │  DELETE /tablets/:id                 — 태블릿 비활성화    │
 * │  GET    /tablets/:id/displays        — 진열 구성 조회    │
 * │  PUT    /tablets/:id/displays        — 진열 구성 저장    │
 * │  GET    /tablets/:id/product-pool    — 상품 풀 조회      │
 * │  GET    /tablets/:id/idle-playlist   — idle playlist 조회 │
 * │  PUT    /tablets/:id/idle-playlist   — idle playlist 저장 │
 * │                                                          │
 * │  POST   /products/register-by-barcode — 바코드 등록      │
 * │                                                          │
 * │  GET    /interest/pending-count      — 미확인 건수       │
 * │  GET    /interest/recent             — 최근 요청 목록    │
 * │  GET    /interest/stats              — 대시보드 통계     │
 * │  PATCH  /interest/:id/acknowledge    — 확인 처리         │
 * │  PATCH  /interest/:id/complete       — 완료 처리         │
 * │  PATCH  /interest/:id/cancel         — 취소 처리         │
 * └──────────────────────────────────────────────────────────┘
 */

import { Router, Request, Response } from 'express';
import { DataSource, In } from 'typeorm';
import { StoreTablet } from './entities/store-tablet.entity.js';
import { StoreTabletDisplay } from './entities/store-tablet-display.entity.js';
import { TabletInterestRequest, InterestRequestStatus } from './entities/tablet-interest-request.entity.js';
import { ProductMaster } from '../../modules/neture/entities/ProductMaster.entity.js';
import { StoreProductProfile } from '../../modules/store-core/entities/StoreProductProfile.entity.js';
import { validateGtin } from '../../utils/gtin.js';
import { createRequireStoreOwner } from '../../utils/store-owner.utils.js';
// WO-O4O-KPA-TABLET-IDLE-BLOCK-INTEGRATION-V1: idle_media block config 검증 (dual-read helper 모듈)
import { parseIdleMediaConfig, resolveIdleMediaItems } from './store-tablet-idle-block.js';
// WO-O4O-KPA-TABLET-CONTENT-LIST-BLOCK-SCHEMA-CONTRACT-V1: content_list config 검증
import { parseContentListConfig } from './store-tablet-content-list-block.js';
// WO-O4O-KPA-TABLET-CONTENT-DRAFT-PREVIEW-V1: 저장 전 draft blocks → sections resolve(read-only) 재사용.
//   공개 /tablet/screen 핸들러와 동일한 resolve 함수(SELECT only)를 관리 라우터에서 재사용한다.
import { resolveContentListItems } from './store-public/store-public-tablet-content-resolve.js';
// WO-O4O-SCREEN-SET-RESOLVER-CONTENT-SOURCE-SEAM-V1: draft preview content_list 원본 조회 기본 Store Adapter 명시 주입.
import { createStoreContentSourceAdapter } from './store-public/store-public-tablet-content-source.js';
import { shapeStaticBlock, resolveTemplateKey } from './store-public/store-public-tablet-screen.js';
// WO-O4O-KPA-TABLET-QR-AUTO-LINK-AND-GUIDE-URL-V1: 저장 시 screen_set QR 멱등 확보 + URL 도출.
import { ensureScreenSetQr, buildScreenSetQrUrl, setScreenSetQrActive } from './store-screen-set-qr.service.js';
// WO-O4O-OPERATOR-SCREEN-SET-HUB-PUBLISH-AND-STORE-INDEPENDENT-COPY-V1: 가져오기 provenance(추적 전용, FK 없음).
import { recordDerivations } from '../o4o-store/services/store-asset-derivation.service.js';
// WO-O4O-SUPPLIER-SCREEN-SET-BACKEND-HUB-COPY-V2B: 공급자 HUB 조회·가져오기 의약품 이중 가드.
import { analyzeScreenSetMedication, medicationStoreAccessAllowed } from './store-tablet-medication-guard.js';

type AuthMiddleware = import('express').RequestHandler;

// 태블릿 관리 라우트는 KPA 전용(/api/v1/store 마운트, service-agnostic). QR URL/서비스 스코프 기본 kpa.
const TABLET_QR_SERVICE_KEY = 'kpa';
// WO-O4O-OPERATOR-SCREEN-SET-HUB-PUBLISH-AND-STORE-INDEPENDENT-COPY-V1:
//   매장 HUB 가 열람·복사하는 운영자 원본의 service_key.
//   **주의**: 운영자 Screen Set 컨트롤러는 kpa.routes 에서 serviceKey='kpa' 로 주입된다
//   (operator-screen-set.controller 는 이 값을 그대로 service_key 에 저장) → 반드시 'kpa' 와 일치해야 한다.
//   (운영자 공용 idle 등 일부 경로가 쓰는 'kpa-society' 와 다른 값이므로 혼용 금지.)
const OPERATOR_TEMPLATE_SERVICE_KEY = 'kpa';

// 저장 응답에 QR 링크 정보를 additive 로 병합. ensure 실패는 저장을 무효화하지 않고 플래그로 표기(§3 복구 가능).
async function withQrLink(
  dataSource: DataSource,
  organizationId: string,
  screenSetId: string,
  base: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  try {
    const qr = await ensureScreenSetQr(dataSource, { organizationId, screenSetId, serviceKey: TABLET_QR_SERVICE_KEY });
    if (qr) return { ...base, publicQrSlug: qr.slug, publicQrUrl: qr.url };
    return { ...base, publicQrSlug: (base.publicQrSlug as string) ?? null, publicQrUrl: null };
  } catch (err) {
    console.error('[StoreTablet] ensureScreenSetQr failed (non-fatal, recoverable):', (err as any)?.message);
    return { ...base, publicQrSlug: (base.publicQrSlug as string) ?? null, publicQrUrl: null, qrLink: 'failed' };
  }
}

// ─────────────────────────────────────────────────────
// Display Guard — 상품 존재 검증
// ─────────────────────────────────────────────────────

interface DisplayItem {
  productType: 'supplier' | 'local';
  productId: string;
  sortOrder: number;
  isVisible: boolean;
  // WO-O4O-KPA-TABLET-DISPLAY-CONTENT-SELECTION-V1: 진열별 선택 콘텐츠(optional, null=선택 해제).
  contentId?: string | null;
}

// 타블렛 진열 product_type ↔ 콘텐츠 연결 sourceType 매핑.
//   supplier(O4O 기반 제품) ↔ listing / local ↔ local
function contentSourceTypeFor(productType: 'supplier' | 'local'): 'listing' | 'local' {
  return productType === 'supplier' ? 'listing' : 'local';
}

async function validateDisplayItems(
  dataSource: DataSource,
  items: DisplayItem[],
  organizationId: string,
): Promise<string | null> {
  for (const item of items) {
    if (!item.productType || !['supplier', 'local'].includes(item.productType)) {
      return `Invalid product_type: ${item.productType}. Must be "supplier" or "local"`;
    }
    if (!item.productId) {
      return 'product_id is required for each display item';
    }

    if (item.productType === 'supplier') {
      const listing = await dataSource.query(
        `SELECT id FROM organization_product_listings
         WHERE id = $1 AND organization_id = $2 AND is_active = true`,
        [item.productId, organizationId],
      );
      if (!listing.length) {
        return `Supplier product listing not found: ${item.productId}`;
      }
    } else if (item.productType === 'local') {
      const local = await dataSource.query(
        `SELECT id FROM store_local_products
         WHERE id = $1 AND organization_id = $2 AND is_active = true`,
        [item.productId, organizationId],
      );
      if (!local.length) {
        return `Local product not found: ${item.productId}`;
      }
    }

    // WO-O4O-KPA-TABLET-DISPLAY-CONTENT-SELECTION-V1:
    //   선택 콘텐츠가 있으면 (a) 같은 org 소유 + (b) 해당 진열 제품에 product_description 으로 실제 연결,
    //   (c) 제품 sourceType/sourceId 정확 일치 까지 확인. 미연결/타제품/타조직/삭제 콘텐츠는 차단.
    if (item.contentId != null) {
      const linked = await dataSource.query(
        `SELECT 1
         FROM kpa_store_content_product_links l
         JOIN kpa_store_contents c
           ON c.id = l.content_id AND c.organization_id = l.organization_id
         WHERE l.organization_id = $1
           AND l.content_id = $2
           AND l.link_type = 'product_description'
           AND l.product_source_type = $3
           AND l.product_source_id = $4
         LIMIT 1`,
        [organizationId, item.contentId, contentSourceTypeFor(item.productType), item.productId],
      );
      if (!linked.length) {
        return `Selected content is not linked to this product: ${item.contentId}`;
      }
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────
// Controller
// ─────────────────────────────────────────────────────

export function createStoreTabletRoutes(
  dataSource: DataSource,
): Router {
  const router = Router();
  const requirePharmacyOwner = createRequireStoreOwner(dataSource);

  // Lazy-loaded requireAuth middleware
  let _requireAuth: AuthMiddleware;
  async function getRequireAuth(): Promise<AuthMiddleware> {
    if (!_requireAuth) {
      const mod = await import('../../middleware/auth.middleware.js');
      _requireAuth = mod.requireAuth as AuthMiddleware;
    }
    return _requireAuth;
  }

  /**
   * Helper: applies requireAuth + requirePharmacyOwner, then calls handler.
   * Replaces the old authenticateAndGetOrg pattern.
   */
  function withStoreAuth(handler: (req: Request, res: Response, organizationId: string) => Promise<void>) {
    return async (req: Request, res: Response): Promise<void> => {
      try {
        const auth = await getRequireAuth();
        await new Promise<void>((resolve, reject) => {
          (auth as any)(req, res, (err: any) => (err ? reject(err) : resolve()));
        });
      } catch {
        return;
      }

      await new Promise<void>((resolve, reject) => {
        (requirePharmacyOwner as any)(req, res, (err: any) => (err ? reject(err) : resolve()));
      }).catch(() => { /* response already sent by middleware */ });

      if (res.headersSent) return;

      const organizationId = req.organizationId!;
      await handler(req, res, organizationId);
    };
  }

  // ─── Tablet CRUD ───────────────────────────────────

  /**
   * GET /tablets
   * 매장 태블릿 목록
   */
  router.get('/tablets', withStoreAuth(async (req, res, organizationId) => {
    try {
      const tablets = await dataSource.query(
        // WO-O4O-KPA-TABLET-SCREEN-SET-BLOCK-EDITOR-UX-V1: current_screen_set_id 노출(에디터 초기 상태). additive.
        `SELECT id, name, location, is_active, created_at,
                current_screen_set_id AS "currentScreenSetId"
         FROM store_tablets
         WHERE organization_id = $1
         ORDER BY created_at DESC`,
        [organizationId],
      );

      res.json({ success: true, data: tablets });
    } catch (error: any) {
      console.error('[StoreTablet] GET /tablets error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tablets',
        code: 'INTERNAL_ERROR',
      });
    }
  }));

  /**
   * POST /tablets
   * 태블릿 등록
   */
  router.post('/tablets', withStoreAuth(async (req, res, organizationId) => {
    try {
      const { name, location } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Tablet name is required',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const repo = dataSource.getRepository(StoreTablet);
      const tablet = repo.create({
        organizationId,
        name: name.trim(),
        location: location || null,
        isActive: true,
      });

      const saved = await repo.save(tablet);
      res.status(201).json({ success: true, data: saved });
    } catch (error: any) {
      console.error('[StoreTablet] POST /tablets error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create tablet',
        code: 'INTERNAL_ERROR',
      });
    }
  }));

  /**
   * PUT /tablets/:id
   * 태블릿 수정
   */
  router.put('/tablets/:id', withStoreAuth(async (req, res, organizationId) => {
    try {
      const tabletId = req.params.id;
      const repo = dataSource.getRepository(StoreTablet);
      const existing = await repo.findOne({
        where: { id: tabletId, organizationId },
      });

      if (!existing) {
        res.status(404).json({
          success: false,
          error: 'Tablet not found',
          code: 'NOT_FOUND',
        });
        return;
      }

      const { name, location, isActive } = req.body;

      if (name !== undefined) existing.name = String(name).trim();
      if (location !== undefined) existing.location = location;
      if (isActive !== undefined) existing.isActive = Boolean(isActive);

      const saved = await repo.save(existing);
      res.json({ success: true, data: saved });
    } catch (error: any) {
      console.error('[StoreTablet] PUT /tablets/:id error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update tablet',
        code: 'INTERNAL_ERROR',
      });
    }
  }));

  /**
   * DELETE /tablets/:id
   * 태블릿 비활성화 (soft delete)
   */
  router.delete('/tablets/:id', withStoreAuth(async (req, res, organizationId) => {
    try {
      const tabletId = req.params.id;
      const result = await dataSource.query(
        `UPDATE store_tablets SET is_active = false
         WHERE id = $1 AND organization_id = $2`,
        [tabletId, organizationId],
      );

      if (result[1] === 0) {
        res.status(404).json({
          success: false,
          error: 'Tablet not found',
          code: 'NOT_FOUND',
        });
        return;
      }

      res.json({ success: true, data: { id: tabletId, isActive: false } });
    } catch (error: any) {
      console.error('[StoreTablet] DELETE /tablets/:id error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to deactivate tablet',
        code: 'INTERNAL_ERROR',
      });
    }
  }));

  // ─── Display Management ────────────────────────────

  /**
   * GET /tablets/:id/displays
   * 태블릿 진열 구성 조회
   */
  router.get('/tablets/:id/displays', withStoreAuth(async (req, res, organizationId) => {
    try {
      const tabletId = req.params.id;

      // Verify tablet ownership
      const tablet = await dataSource.query(
        `SELECT id FROM store_tablets WHERE id = $1 AND organization_id = $2`,
        [tabletId, organizationId],
      );
      if (!tablet.length) {
        res.status(404).json({
          success: false,
          error: 'Tablet not found',
          code: 'NOT_FOUND',
        });
        return;
      }

      const displays = await dataSource.query(
        // WO-O4O-KPA-TABLET-DISPLAY-CONTENT-SELECTION-V1: 선택 콘텐츠 메타 동봉(미선택/삭제 시 null).
        `SELECT d.id, d.product_type, d.product_id, d.sort_order, d.is_visible, d.created_at,
                d.content_id AS "contentId",
                c.title AS "contentTitle",
                c.source_type AS "contentSourceType",
                c.workspace_status AS "contentStatus"
         FROM store_tablet_displays d
         LEFT JOIN kpa_store_contents c ON c.id = d.content_id
         WHERE d.tablet_id = $1
         ORDER BY d.sort_order ASC`,
        [tabletId],
      );

      res.json({ success: true, data: displays });
    } catch (error: any) {
      console.error('[StoreTablet] GET /tablets/:id/displays error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch displays',
        code: 'INTERNAL_ERROR',
      });
    }
  }));

  /**
   * PUT /tablets/:id/displays
   * 태블릿 진열 구성 저장 (전체 교체)
   *
   * Body: { displays: [{ productType, productId, sortOrder, isVisible }] }
   *
   * Phase 3 Guard: 각 상품의 존재 + 소유권 검증
   */
  router.put('/tablets/:id/displays', withStoreAuth(async (req, res, organizationId) => {
    try {
      const tabletId = req.params.id;

      // Verify tablet ownership
      const tablet = await dataSource.query(
        `SELECT id FROM store_tablets WHERE id = $1 AND organization_id = $2`,
        [tabletId, organizationId],
      );
      if (!tablet.length) {
        res.status(404).json({
          success: false,
          error: 'Tablet not found',
          code: 'NOT_FOUND',
        });
        return;
      }

      const { displays } = req.body;
      if (!Array.isArray(displays)) {
        res.status(400).json({
          success: false,
          error: 'displays must be an array',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      // Phase 3 Guard: Validate all display items
      const validationError = await validateDisplayItems(dataSource, displays, organizationId);
      if (validationError) {
        res.status(400).json({
          success: false,
          error: validationError,
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      // Transaction: delete existing + insert new
      await dataSource.transaction(async (manager) => {
        await manager.query(
          `DELETE FROM store_tablet_displays WHERE tablet_id = $1`,
          [tabletId],
        );

        for (let i = 0; i < displays.length; i++) {
          const item = displays[i];
          await manager.query(
            `INSERT INTO store_tablet_displays (tablet_id, product_type, product_id, sort_order, is_visible, content_id)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              tabletId,
              item.productType,
              item.productId,
              item.sortOrder ?? i,
              item.isVisible !== false,
              // WO-O4O-KPA-TABLET-DISPLAY-CONTENT-SELECTION-V1: 진열별 선택 콘텐츠(없으면 NULL).
              item.contentId ?? null,
            ],
          );
        }
      });

      // Return updated displays
      const updated = await dataSource.query(
        // WO-O4O-KPA-TABLET-DISPLAY-CONTENT-SELECTION-V1: 선택 콘텐츠 메타 동봉(미선택/삭제 시 null).
        `SELECT d.id, d.product_type, d.product_id, d.sort_order, d.is_visible, d.created_at,
                d.content_id AS "contentId",
                c.title AS "contentTitle",
                c.source_type AS "contentSourceType",
                c.workspace_status AS "contentStatus"
         FROM store_tablet_displays d
         LEFT JOIN kpa_store_contents c ON c.id = d.content_id
         WHERE d.tablet_id = $1
         ORDER BY d.sort_order ASC`,
        [tabletId],
      );

      res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('[StoreTablet] PUT /tablets/:id/displays error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save displays',
        code: 'INTERNAL_ERROR',
      });
    }
  }));

  // ─── Idle Playlist (WO-O4O-TABLET-IDLE-PLAYLIST-EDITOR-V1) ─────────────────
  //
  // 정책:
  // - 매장당 N 개 tablet 등록 가능하나 device pairing 부재로 kiosk URL 에서 식별 불가
  // - 따라서 매장 단위 설정으로 운영. 단 storage 자체는 tablet row 컬럼 (idle_playlist_items)
  //   에 저장 → device pairing 도입 시 tablet 별 설정으로 자연스럽게 진화 가능
  // - GET /tablets/:id/idle-playlist 는 admin 전용 (편집 화면에서 사용)
  // - 공개 kiosk fetch 는 별도 GET /:slug/tablet/idle 사용 (매장의 첫 active tablet row)

  /**
   * Validate idle playlist items.
   * 형식: [{ type: 'image'|'video'|'youtube'|'vimeo', url: string, durationMs?: number }, ...]
   * WO-O4O-KPA-TABLET-CORNER-IDLE-YOUTUBE-VIMEO-AUTO-RETURN-V1: youtube/vimeo 추가.
   */
  function validateIdlePlaylistItems(items: unknown): { items: any[] } | string {
    if (!Array.isArray(items)) {
      return 'items must be an array';
    }
    const ALLOWED_TYPES = ['image', 'video', 'youtube', 'vimeo'];
    const out: any[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i] as any;
      if (!it || typeof it !== 'object') {
        return `items[${i}] must be an object`;
      }
      if (!ALLOWED_TYPES.includes(it.type)) {
        return `items[${i}].type must be one of ${ALLOWED_TYPES.join(', ')}`;
      }
      if (typeof it.url !== 'string' || it.url.trim().length === 0) {
        return `items[${i}].url must be a non-empty string`;
      }
      const url = it.url.trim();
      // 보수적 검증: http(s) 또는 / 시작 (relative)
      if (!/^https?:\/\//i.test(url) && !url.startsWith('/')) {
        return `items[${i}].url must start with http(s):// or /`;
      }
      // provider 별 도메인 검증
      if (it.type === 'youtube' && !/(?:youtube\.com|youtu\.be)/i.test(url)) {
        return `items[${i}].url must be a youtube.com / youtu.be URL`;
      }
      if (it.type === 'vimeo' && !/vimeo\.com/i.test(url)) {
        return `items[${i}].url must be a vimeo.com URL`;
      }
      let durationMs: number | undefined;
      if (it.durationMs !== undefined && it.durationMs !== null) {
        const n = Number(it.durationMs);
        if (!Number.isFinite(n) || n < 1000) {
          return `items[${i}].durationMs must be >= 1000`;
        }
        durationMs = Math.floor(n);
      }
      const record: any = { type: it.type, url };
      if (durationMs !== undefined) record.durationMs = durationMs;
      out.push(record);
    }
    return { items: out };
  }

  /**
   * GET /tablets/:id/idle-playlist
   * Tablet idle playlist 조회 (admin)
   */
  router.get('/tablets/:id/idle-playlist', withStoreAuth(async (req, res, organizationId) => {
    try {
      const tabletId = req.params.id;

      const rows = await dataSource.query(
        `SELECT idle_playlist_items
         FROM store_tablets
         WHERE id = $1 AND organization_id = $2`,
        [tabletId, organizationId],
      );

      if (!rows.length) {
        res.status(404).json({
          success: false,
          error: 'Tablet not found',
          code: 'NOT_FOUND',
        });
        return;
      }

      const items = Array.isArray(rows[0].idle_playlist_items)
        ? rows[0].idle_playlist_items
        : [];

      res.json({ success: true, data: { items } });
    } catch (error: any) {
      console.error('[StoreTablet] GET /tablets/:id/idle-playlist error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch idle playlist',
        code: 'INTERNAL_ERROR',
      });
    }
  }));

  /**
   * PUT /tablets/:id/idle-playlist
   * Tablet idle playlist 저장 (전체 교체)
   *
   * Body: { items: IdlePlaylistItem[] }
   * 빈 배열 허용 (idle 화면에서 placeholder 표시).
   */
  router.put('/tablets/:id/idle-playlist', withStoreAuth(async (req, res, organizationId) => {
    try {
      const tabletId = req.params.id;

      const validation = validateIdlePlaylistItems(req.body?.items);
      if (typeof validation === 'string') {
        res.status(400).json({
          success: false,
          error: validation,
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const updateResult = await dataSource.query(
        `UPDATE store_tablets
         SET idle_playlist_items = $1::jsonb
         WHERE id = $2 AND organization_id = $3
         RETURNING idle_playlist_items`,
        [JSON.stringify(validation.items), tabletId, organizationId],
      );

      if (!updateResult?.[0]) {
        res.status(404).json({
          success: false,
          error: 'Tablet not found',
          code: 'NOT_FOUND',
        });
        return;
      }

      res.json({
        success: true,
        data: { items: updateResult[0].idle_playlist_items ?? [] },
      });
    } catch (error: any) {
      console.error('[StoreTablet] PUT /tablets/:id/idle-playlist error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save idle playlist',
        code: 'INTERNAL_ERROR',
      });
    }
  }));

  // ─── 서비스 운영자 공통 대기 영상 (WO-O4O-KPA-TABLET-OPERATOR-COMMON-IDLE-VIDEO-SELECTION-V1) ───
  //   운영자가 등록한 signage_forced_content(target_surface in tablet_idle/both) 중
  //   매장 경영자가 태블릿별로 1개 선택. 영상 등록/수정/삭제 권한은 운영자 전용(여기선 조회·선택만).
  //   KPA 스코프: service_key='kpa-society' (공개 idle/운영자 화면과 동일).
  const KPA_FORCED_SERVICE_KEY = 'kpa-society';

  // GET /tablet-operator-common-idle-candidates — 태블릿 대상 공통 영상 후보(상태 포함)
  router.get('/tablet-operator-common-idle-candidates', withStoreAuth(async (_req, res, _organizationId) => {
    try {
      const rows = await dataSource.query(
        `SELECT id, title, video_url AS "videoUrl", source_type AS "sourceType",
                embed_id AS "embedId", thumbnail_url AS "thumbnailUrl",
                start_at AS "startAt", end_at AS "endAt",
                tablet_duration_seconds AS "tabletDurationSeconds",
                CASE
                  WHEN NOW() < start_at THEN 'upcoming'
                  WHEN NOW() > end_at THEN 'expired'
                  ELSE 'active'
                END AS status
         FROM signage_forced_content
         WHERE service_key = $1
           AND target_surface IN ('tablet_idle','both')
           AND is_active = true
           AND deleted_at IS NULL
         ORDER BY start_at DESC`,
        [KPA_FORCED_SERVICE_KEY],
      );
      res.json({ success: true, data: rows });
    } catch (error: any) {
      console.error('[StoreTablet] GET /tablet-operator-common-idle-candidates error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch candidates', code: 'INTERNAL_ERROR' });
    }
  }));

  // POST /tablets/:id/operator-common-idle-selection { forcedContentId } — 태블릿별 1개 선택
  router.post('/tablets/:id/operator-common-idle-selection', withStoreAuth(async (req, res, organizationId) => {
    try {
      const tabletId = req.params.id;
      const userId = (req as any).user?.id ?? null;
      const forcedContentId = req.body?.forcedContentId;
      if (!forcedContentId || typeof forcedContentId !== 'string') {
        res.status(400).json({ success: false, error: 'forcedContentId is required', code: 'VALIDATION_ERROR' });
        return;
      }
      // 태블릿이 이 매장 소속인지 확인
      const t = await dataSource.query(
        `SELECT id FROM store_tablets WHERE id = $1 AND organization_id = $2 LIMIT 1`,
        [tabletId, organizationId],
      );
      if (!t?.[0]) {
        res.status(404).json({ success: false, error: 'Tablet not found', code: 'NOT_FOUND' });
        return;
      }
      // forced content 가 유효한 태블릿 후보인지 확인(등록/수정 권한 아님 — 선택 대상 검증만)
      const fc = await dataSource.query(
        `SELECT id FROM signage_forced_content
         WHERE id = $1 AND service_key = $2
           AND target_surface IN ('tablet_idle','both')
           AND is_active = true AND deleted_at IS NULL
         LIMIT 1`,
        [forcedContentId, KPA_FORCED_SERVICE_KEY],
      );
      if (!fc?.[0]) {
        res.status(400).json({ success: false, error: '유효한 태블릿 공통 영상 후보가 아닙니다.', code: 'INVALID_CANDIDATE' });
        return;
      }
      // 태블릿당 active 1개: 기존 active 해제 후 삽입(partial unique 충돌 방지)
      await dataSource.query(
        `UPDATE store_tablet_operator_idle_selections
         SET cleared_at = NOW(), updated_at = NOW()
         WHERE tablet_id = $1 AND cleared_at IS NULL`,
        [tabletId],
      );
      const ins = await dataSource.query(
        `INSERT INTO store_tablet_operator_idle_selections
           (organization_id, tablet_id, forced_content_id, selected_by_user_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, forced_content_id AS "forcedContentId", selected_at AS "selectedAt"`,
        [organizationId, tabletId, forcedContentId, userId],
      );
      res.status(201).json({ success: true, data: ins[0] });
    } catch (error: any) {
      console.error('[StoreTablet] POST operator-common-idle-selection error:', error);
      res.status(500).json({ success: false, error: 'Failed to save selection', code: 'INTERNAL_ERROR' });
    }
  }));

  // DELETE /tablets/:id/operator-common-idle-selection — 선택 해제
  router.delete('/tablets/:id/operator-common-idle-selection', withStoreAuth(async (req, res, organizationId) => {
    try {
      const tabletId = req.params.id;
      await dataSource.query(
        `UPDATE store_tablet_operator_idle_selections
         SET cleared_at = NOW(), updated_at = NOW()
         WHERE tablet_id = $1 AND organization_id = $2 AND cleared_at IS NULL`,
        [tabletId, organizationId],
      );
      res.json({ success: true, data: { tabletId, cleared: true } });
    } catch (error: any) {
      console.error('[StoreTablet] DELETE operator-common-idle-selection error:', error);
      res.status(500).json({ success: false, error: 'Failed to clear selection', code: 'INTERNAL_ERROR' });
    }
  }));

  // GET /tablets/:id/operator-common-idle-selection — 현재 선택(상태 포함, 만료여도 보존 반환)
  router.get('/tablets/:id/operator-common-idle-selection', withStoreAuth(async (req, res, organizationId) => {
    try {
      const tabletId = req.params.id;
      const rows = await dataSource.query(
        `SELECT s.id, s.forced_content_id AS "forcedContentId", s.selected_at AS "selectedAt",
                fc.title, fc.video_url AS "videoUrl", fc.source_type AS "sourceType",
                fc.thumbnail_url AS "thumbnailUrl", fc.start_at AS "startAt", fc.end_at AS "endAt",
                fc.is_active AS "isActive", fc.deleted_at AS "deletedAt", fc.target_surface AS "targetSurface",
                CASE
                  WHEN fc.deleted_at IS NOT NULL OR fc.is_active = false
                    OR fc.target_surface NOT IN ('tablet_idle','both') THEN 'unavailable'
                  WHEN NOW() < fc.start_at THEN 'upcoming'
                  WHEN NOW() > fc.end_at THEN 'expired'
                  ELSE 'active'
                END AS status
         FROM store_tablet_operator_idle_selections s
         JOIN signage_forced_content fc ON fc.id = s.forced_content_id
         WHERE s.tablet_id = $1 AND s.organization_id = $2 AND s.cleared_at IS NULL
         LIMIT 1`,
        [tabletId, organizationId],
      );
      res.json({ success: true, data: rows?.[0] ?? null });
    } catch (error: any) {
      console.error('[StoreTablet] GET operator-common-idle-selection error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch selection', code: 'INTERNAL_ERROR' });
    }
  }));

  // ─── Display Settings (WO-O4O-KPA-TABLET-DISPLAY-SETTINGS-V1) ──────────
  // 매장(organization) 공통 타블렛 전시 설정. /tablets/:id 충돌을 피해 별도 세그먼트 사용.
  // 가격/QR/상담버튼 노출 + 자동 넘김/idle 전환 시간. 주문/결제와 무관(전시·안내 노출 규칙).

  // WO-O4O-KPA-TABLET-PUBLIC-INFO-UX-PRIVACY-INPUT-REMOVAL-V1:
  //   태블릿 V1 = 공용 안내 화면. 상담 요청 버튼은 신규 기본값 OFF(후속 기능).
  //   (기존 row 가 true 인 매장은 그대로 유지 — 일괄 마이그레이션은 별도 판단)
  const DISPLAY_SETTINGS_DEFAULT = {
    showPrice: true,
    showQr: true,
    showConsultationButton: false,
    autoSlideSeconds: 10,
    idleSlideSeconds: 10,
  };

  /** GET /tablet-display-settings — 매장 전시 설정 조회(없으면 기본값) */
  router.get('/tablet-display-settings', withStoreAuth(async (_req, res, organizationId) => {
    try {
      const rows = await dataSource.query(
        `SELECT show_price, show_qr, show_consultation_button, auto_slide_seconds, idle_slide_seconds
         FROM store_tablet_display_settings WHERE organization_id = $1 LIMIT 1`,
        [organizationId],
      );
      const r = rows?.[0];
      res.json({
        success: true,
        data: r
          ? {
              showPrice: r.show_price,
              showQr: r.show_qr,
              showConsultationButton: r.show_consultation_button,
              autoSlideSeconds: r.auto_slide_seconds,
              idleSlideSeconds: r.idle_slide_seconds,
            }
          : { ...DISPLAY_SETTINGS_DEFAULT },
      });
    } catch (error: any) {
      console.error('[StoreTablet] GET /tablet-display-settings error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch display settings', code: 'INTERNAL_ERROR' });
    }
  }));

  /** PUT /tablet-display-settings — 매장 전시 설정 저장(upsert) */
  router.put('/tablet-display-settings', withStoreAuth(async (req, res, organizationId) => {
    try {
      const b = req.body ?? {};
      const AUTO_ALLOWED = [0, 5, 10, 15, 30];
      const IDLE_ALLOWED = [5, 10, 15, 30];
      const showPrice = b.showPrice !== false;
      const showQr = b.showQr !== false;
      const showConsultationButton = b.showConsultationButton !== false;
      const autoSlideSeconds = AUTO_ALLOWED.includes(Number(b.autoSlideSeconds)) ? Number(b.autoSlideSeconds) : 10;
      const idleSlideSeconds = IDLE_ALLOWED.includes(Number(b.idleSlideSeconds)) ? Number(b.idleSlideSeconds) : 10;

      const rows = await dataSource.query(
        `INSERT INTO store_tablet_display_settings
           (organization_id, show_price, show_qr, show_consultation_button, auto_slide_seconds, idle_slide_seconds, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (organization_id) DO UPDATE SET
           show_price = EXCLUDED.show_price,
           show_qr = EXCLUDED.show_qr,
           show_consultation_button = EXCLUDED.show_consultation_button,
           auto_slide_seconds = EXCLUDED.auto_slide_seconds,
           idle_slide_seconds = EXCLUDED.idle_slide_seconds,
           updated_at = NOW()
         RETURNING show_price, show_qr, show_consultation_button, auto_slide_seconds, idle_slide_seconds`,
        [organizationId, showPrice, showQr, showConsultationButton, autoSlideSeconds, idleSlideSeconds],
      );
      const r = rows[0];
      res.json({
        success: true,
        data: {
          showPrice: r.show_price,
          showQr: r.show_qr,
          showConsultationButton: r.show_consultation_button,
          autoSlideSeconds: r.auto_slide_seconds,
          idleSlideSeconds: r.idle_slide_seconds,
        },
      });
    } catch (error: any) {
      console.error('[StoreTablet] PUT /tablet-display-settings error:', error);
      res.status(500).json({ success: false, error: 'Failed to save display settings', code: 'INTERNAL_ERROR' });
    }
  }));

  // ─── Product Pool ──────────────────────────────────

  /**
   * GET /tablets/:id/product-pool
   * 태블릿에 진열 가능한 상품 풀 조회
   *
   * 반환: { supplierProducts: [...], localProducts: [...] }
   */
  router.get('/tablets/:id/product-pool', withStoreAuth(async (req, res, organizationId) => {
    try {
      const tabletId = req.params.id;

      // Verify tablet ownership
      const tablet = await dataSource.query(
        `SELECT id FROM store_tablets WHERE id = $1 AND organization_id = $2`,
        [tabletId, organizationId],
      );
      if (!tablet.length) {
        res.status(404).json({
          success: false,
          error: 'Tablet not found',
          code: 'NOT_FOUND',
        });
        return;
      }

      // Fetch supplier products (organization_product_listings)
      const [supplierProducts, localProducts] = await Promise.all([
        dataSource.query(
          `SELECT opl.id, opl.offer_id, pm.name AS product_name, spo.price_general AS retail_price,
                  opl.is_active, opl.created_at, opl.service_key
           FROM organization_product_listings opl
           LEFT JOIN supplier_product_offers spo ON spo.id = opl.offer_id
           LEFT JOIN product_masters pm ON pm.id = spo.master_id
           WHERE opl.organization_id = $1 AND opl.is_active = true
           ORDER BY opl.created_at ASC, pm.name ASC`,
          [organizationId],
        ),
        dataSource.query(
          `SELECT id, name, description, summary, thumbnail_url, images, gallery_images,
                  category, price_display, badge_type, highlight_flag,
                  is_active, sort_order
           FROM store_local_products
           WHERE organization_id = $1 AND is_active = true
           ORDER BY sort_order ASC, name ASC`,
          [organizationId],
        ),
      ]);

      res.json({
        success: true,
        data: {
          supplierProducts,
          localProducts,
        },
      });
    } catch (error: any) {
      console.error('[StoreTablet] GET /tablets/:id/product-pool error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch product pool',
        code: 'INTERNAL_ERROR',
      });
    }
  }));

  // ─── Barcode Product Registration (WO-O4O-TABLET-MODULE-V1) ──

  /**
   * POST /products/register-by-barcode
   * 바코드 스캔 → Master 조회 → StoreProductProfile upsert
   *
   * Body: { barcode: string }
   */
  router.post('/products/register-by-barcode', withStoreAuth(async (req, res, organizationId) => {
    try {
      const { barcode } = req.body;
      if (!barcode || typeof barcode !== 'string') {
        res.status(400).json({
          success: false,
          error: 'barcode is required',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const trimmed = barcode.trim();

      // GTIN 검증
      const gtinError = validateGtin(trimmed);
      if (gtinError) {
        res.status(400).json({
          success: false,
          error: `INVALID_GTIN: ${gtinError}`,
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      // Master 조회
      const masterRepo = dataSource.getRepository(ProductMaster);
      const master = await masterRepo.findOne({ where: { barcode: trimmed } });
      if (!master) {
        res.status(404).json({
          success: false,
          error: 'MASTER_NOT_FOUND',
          code: 'NOT_FOUND',
        });
        return;
      }

      // StoreProductProfile upsert (UNIQUE: organization_id + master_id)
      const profileRepo = dataSource.getRepository(StoreProductProfile);
      let profile = await profileRepo.findOne({
        where: { organizationId, masterId: master.id },
      });

      if (!profile) {
        profile = profileRepo.create({
          organizationId,
          masterId: master.id,
          displayName: master.name,
          isActive: true,
        });
        profile = await profileRepo.save(profile);
      }

      res.status(201).json({
        success: true,
        data: {
          profileId: profile.id,
          masterId: master.id,
          barcode: master.barcode,
          name: master.name,
          regulatoryName: master.regulatoryName,
          manufacturerName: master.manufacturerName,
          displayName: profile.displayName,
          isActive: profile.isActive,
          isNew: !profile.updatedAt || profile.createdAt.getTime() === profile.updatedAt.getTime(),
        },
      });
    } catch (error: any) {
      console.error('[StoreTablet] POST /products/register-by-barcode error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to register product by barcode',
        code: 'INTERNAL_ERROR',
      });
    }
  }));

  // ─── Interest Request Staff Routes (WO-O4O-TABLET-MODULE-V1) ──

  // Valid status transitions
  const INTEREST_TRANSITIONS: Record<string, InterestRequestStatus[]> = {
    [InterestRequestStatus.REQUESTED]: [InterestRequestStatus.ACKNOWLEDGED, InterestRequestStatus.COMPLETED, InterestRequestStatus.CANCELLED],
    [InterestRequestStatus.ACKNOWLEDGED]: [InterestRequestStatus.COMPLETED, InterestRequestStatus.CANCELLED],
    [InterestRequestStatus.COMPLETED]: [],
    [InterestRequestStatus.CANCELLED]: [],
  };

  /**
   * GET /interest/pending-count
   * 미확인 관심 요청 건수 (3초 폴링용 — 경량 COUNT)
   */
  router.get('/interest/pending-count', withStoreAuth(async (req, res, organizationId) => {
    try {
      const result: Array<{ count: string }> = await dataSource.query(
        `SELECT COUNT(*)::int AS count
         FROM tablet_interest_requests
         WHERE organization_id = $1 AND status = 'REQUESTED'`,
        [organizationId],
      );

      res.json({
        success: true,
        data: { count: Number(result[0]?.count || 0) },
      });
    } catch (error: any) {
      console.error('[StoreTablet] GET /interest/pending-count error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pending count',
        code: 'INTERNAL_ERROR',
      });
    }
  }));

  /**
   * GET /interest/recent
   * 최근 관심 요청 목록 (REQUESTED + ACKNOWLEDGED, 최신 50건)
   */
  router.get('/interest/recent', withStoreAuth(async (req, res, organizationId) => {
    try {
      const interestRepo = dataSource.getRepository(TabletInterestRequest);
      const requests = await interestRepo.find({
        where: {
          organizationId,
          status: In([InterestRequestStatus.REQUESTED, InterestRequestStatus.ACKNOWLEDGED]),
        },
        order: { createdAt: 'DESC' },
        take: 50,
      });

      res.json({
        success: true,
        data: requests.map((r) => ({
          id: r.id,
          masterId: r.masterId,
          productName: r.productName,
          customerName: r.customerName,
          customerNote: r.customerNote,
          status: r.status,
          createdAt: r.createdAt,
          acknowledgedAt: r.acknowledgedAt,
        })),
      });
    } catch (error: any) {
      console.error('[StoreTablet] GET /interest/recent error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recent interest requests',
        code: 'INTERNAL_ERROR',
      });
    }
  }));

  /**
   * GET /interest/stats
   * 대시보드용 관심 요청 통계
   */
  router.get('/interest/stats', withStoreAuth(async (req, res, organizationId) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [pendingResult, todayResult, completedTodayResult, topProducts] = await Promise.all([
        dataSource.query(
          `SELECT COUNT(*)::int AS count
           FROM tablet_interest_requests
           WHERE organization_id = $1 AND status = 'REQUESTED'`,
          [organizationId],
        ) as Promise<Array<{ count: number }>>,
        dataSource.query(
          `SELECT COUNT(*)::int AS count
           FROM tablet_interest_requests
           WHERE organization_id = $1 AND created_at >= $2`,
          [organizationId, today],
        ) as Promise<Array<{ count: number }>>,
        dataSource.query(
          `SELECT COUNT(*)::int AS count
           FROM tablet_interest_requests
           WHERE organization_id = $1 AND status = 'COMPLETED' AND completed_at >= $2`,
          [organizationId, today],
        ) as Promise<Array<{ count: number }>>,
        dataSource.query(
          `SELECT master_id, product_name, COUNT(*)::int AS count
           FROM tablet_interest_requests
           WHERE organization_id = $1 AND created_at >= $2
           GROUP BY master_id, product_name
           ORDER BY count DESC
           LIMIT 5`,
          [organizationId, today],
        ) as Promise<Array<{ master_id: string; product_name: string; count: number }>>,
      ]);

      res.json({
        success: true,
        data: {
          pendingCount: Number(pendingResult[0]?.count || 0),
          todayCount: Number(todayResult[0]?.count || 0),
          completedTodayCount: Number(completedTodayResult[0]?.count || 0),
          topProducts: topProducts.map((p) => ({
            masterId: p.master_id,
            productName: p.product_name,
            count: Number(p.count),
          })),
        },
      });
    } catch (error: any) {
      console.error('[StoreTablet] GET /interest/stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch interest stats',
        code: 'INTERNAL_ERROR',
      });
    }
  }));

  /**
   * PATCH /interest/:id/acknowledge
   * 관심 요청 확인 처리
   */
  router.patch('/interest/:id/acknowledge', withStoreAuth(async (req, res, organizationId) => {
    await handleInterestTransition(dataSource, req, res, organizationId, InterestRequestStatus.ACKNOWLEDGED, INTEREST_TRANSITIONS);
  }));

  /**
   * PATCH /interest/:id/complete
   * 관심 요청 완료 처리
   */
  router.patch('/interest/:id/complete', withStoreAuth(async (req, res, organizationId) => {
    await handleInterestTransition(dataSource, req, res, organizationId, InterestRequestStatus.COMPLETED, INTEREST_TRANSITIONS);
  }));

  /**
   * PATCH /interest/:id/cancel
   * 관심 요청 취소 처리
   */
  router.patch('/interest/:id/cancel', withStoreAuth(async (req, res, organizationId) => {
    await handleInterestTransition(dataSource, req, res, organizationId, InterestRequestStatus.CANCELLED, INTEREST_TRANSITIONS);
  }));

  // ─── Screen Set / Block 관리 API (WO-O4O-KPA-TABLET-SCREEN-SET-BLOCK-API-IMPLEMENTATION-V1) ───
  //   계약: CHECK-O4O-KPA-TABLET-SCREEN-SET-BLOCK-API-CONTRACT-V1
  //   - org 스코프 강제(organization_id = auth org). origin/service_key 는 요청 신뢰 안 함(서버 강제).
  //   - blocks 저장 = 전체 교체(displays PUT 패턴). isEnabled(DTO) ↔ is_visible(컬럼).
  //   - block_type = 배포 CHECK 7종만(notice/qr_link 미지원 — 배포 스키마 정본).
  //   - description(WO §5)은 배포 스키마에 컬럼 없어 미지원(name만). current_screen_set_id NULL = legacy.
  //   - 경로 top-level /store/screen-sets (/tablets/:id 포획 회피). public runtime 미접촉.
  const SET_BLOCK_TYPES = [
    'idle_media', 'product_list', 'product_content',
    'corner_description', 'health_info', 'staff_inquiry', 'qr_guide',
    // WO-O4O-KPA-TABLET-CONTENT-LIST-BLOCK-SCHEMA-CONTRACT-V1: 코너 콘텐츠 카드 목록(신규).
    'content_list',
  ];
  const SET_STATUSES_WRITABLE = ['draft', 'active', 'archived'];
  // WO-O4O-KPA-TABLET-SCREEN-SET-TEMPLATE-KEY-SCHEMA-V1 / -TEMPLATE-APPLY-V1 / -TEMPLATE-THREE-PATTERNS-V1:
  //   저장 허용 template_key. 각 값은 kiosk-core 렌더러 분기가 구현되어 있어야 한다(공개 runtime 은 pass-through).
  //   - corner_information_basic_v1(기본) / product_focus(-TEMPLATE-APPLY-V1)
  //   - idle_touch_video / corner_overview_qr / product_grid_qr (-TEMPLATE-THREE-PATTERNS-V1)
  const SET_TEMPLATE_KEYS_ALLOWED = [
    'corner_information_basic_v1',
    'product_focus',
    'idle_touch_video',
    'corner_overview_qr',
    'product_grid_qr',
  ];
  const setCols = (p: string) =>
    `${p}id, ${p}organization_id AS "organizationId", ${p}service_key AS "serviceKey", ` +
    // WO-O4O-SCREEN-SET-OWNER-SCOPE-SCHEMA-MIGRATION-V1: supplier_id(additive, store/operator=null) 응답 포함.
    `${p}supplier_id AS "supplierId", ` +
    `${p}tablet_id AS "tabletId", ${p}name, ${p}origin, ${p}status, ` +
    `COALESCE(${p}template_key, 'corner_information_basic_v1') AS "templateKey", ` +
    // WO-O4O-KPA-TABLET-QR-AUTO-LINK-AND-GUIDE-URL-V1: 연결된 screen_set QR slug(additive, nullable).
    `${p}public_qr_slug AS "publicQrSlug", ` +
    `${p}created_by_user_id AS "createdByUserId", ${p}created_at AS "createdAt", ${p}updated_at AS "updatedAt"`;
  const blockCols = (p: string) =>
    `${p}id, ${p}screen_set_id AS "screenSetId", ${p}block_type AS "blockType", ${p}sort_order AS "sortOrder", ` +
    `${p}is_visible AS "isEnabled", ${p}config, ${p}created_at AS "createdAt", ${p}updated_at AS "updatedAt"`;

  // WO-O4O-STORE-SCREEN-SET-ORIGIN-ISOLATION-HARDENING-V1 §2·§4:
  //   TypeORM dataSource.query()/manager.query() 의 UPDATE ... RETURNING 은 [rows, affectedCount] 를 반환
  //   (INSERT ... RETURNING 은 rows 배열 직접). 빈 배열도 truthy 라 `!res?.[0]` 로는 0-row(미존재) 판정이
  //   누락되어 없는 ID 에도 200 을 반환하던 버그가 있었다. 첫 반환 row(객체)만 안전하게 꺼내 404 판정에 쓴다.
  const firstReturnedRow = (result: unknown): any | null => {
    if (!Array.isArray(result)) return null;
    const rows = Array.isArray(result[0]) ? (result[0] as unknown[]) : (result as unknown[]);
    return (rows[0] as any) ?? null;
  };

  // GET /screen-sets — 목록 (org 스코프). filter: tabletId / status / includeArchived
  router.get('/screen-sets', withStoreAuth(async (req, res, organizationId) => {
    try {
      // WO-O4O-STORE-SCREEN-SET-ORIGIN-ISOLATION-HARDENING-V1: 매장 목록은 매장 소유(origin='store') 원본만.
      const where: string[] = ['s.organization_id = $1', "s.origin = 'store'", 's.deleted_at IS NULL'];
      const params: any[] = [organizationId];
      const { tabletId, status, includeArchived } = req.query;
      if (tabletId && typeof tabletId === 'string') { params.push(tabletId); where.push(`s.tablet_id = $${params.length}`); }
      if (status && typeof status === 'string') { params.push(status); where.push(`s.status = $${params.length}`); }
      if (includeArchived !== 'true') { where.push(`s.status <> 'archived'`); }
      const rows = await dataSource.query(
        `SELECT ${setCols('s.')},
                (SELECT count(*)::int FROM store_tablet_screen_blocks b WHERE b.screen_set_id = s.id) AS "blockCount",
                EXISTS(SELECT 1 FROM store_tablets t WHERE t.current_screen_set_id = s.id) AS "isApplied"
         FROM store_tablet_screen_sets s
         WHERE ${where.join(' AND ')}
         ORDER BY s.updated_at DESC`,
        params,
      );
      res.json({ success: true, data: rows });
    } catch (error: any) {
      console.error('[StoreTablet] GET /screen-sets error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch screen sets', code: 'INTERNAL_ERROR' });
    }
  }));

  // GET /screen-sets/:id — 상세 + blocks
  router.get('/screen-sets/:id', withStoreAuth(async (req, res, organizationId) => {
    try {
      const rows = await dataSource.query(
        `SELECT ${setCols('s.')} FROM store_tablet_screen_sets s
         WHERE s.id = $1 AND s.organization_id = $2 AND s.origin = 'store' AND s.deleted_at IS NULL LIMIT 1`,
        [req.params.id, organizationId],
      );
      if (!rows?.[0]) { res.status(404).json({ success: false, error: 'Screen set not found', code: 'SCREEN_SET_NOT_FOUND' }); return; }
      const blocks = await dataSource.query(
        `SELECT ${blockCols('')} FROM store_tablet_screen_blocks WHERE screen_set_id = $1 ORDER BY sort_order ASC`,
        [req.params.id],
      );
      // WO-O4O-KPA-TABLET-QR-AUTO-LINK-AND-GUIDE-URL-V1 §4: 관리 상세 진입 시 owner 인증 하 lazy ensure
      //   (과거 저장/연결 누락 콘텐츠 복구). 공개 runtime 은 read-only 유지(여기 아님).
      res.json({ success: true, data: await withQrLink(dataSource, organizationId, req.params.id, { ...rows[0], blocks }) });
    } catch (error: any) {
      console.error('[StoreTablet] GET /screen-sets/:id error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch screen set', code: 'INTERNAL_ERROR' });
    }
  }));

  // POST /screen-sets — 생성 (origin='store', service_key/org 서버 강제)
  router.post('/screen-sets', withStoreAuth(async (req, res, organizationId) => {
    try {
      const userId = (req as any).user?.id ?? null;
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      if (!name) { res.status(400).json({ success: false, error: 'Screen set name is required', code: 'SCREEN_SET_NAME_REQUIRED' }); return; }
      if (name.length > 120) { res.status(400).json({ success: false, error: 'name too long (max 120)', code: 'VALIDATION_ERROR' }); return; }
      const status = req.body?.status === 'active' ? 'active' : 'draft';
      // WO-O4O-KPA-TABLET-SCREEN-SET-TEMPLATE-KEY-SCHEMA-V1: templateKey(옵션). 미지정=NULL(=기본).
      let templateKey: string | null = null;
      if (req.body?.templateKey != null) {
        templateKey = String(req.body.templateKey);
        if (!SET_TEMPLATE_KEYS_ALLOWED.includes(templateKey)) { res.status(400).json({ success: false, error: `invalid templateKey (allowed: ${SET_TEMPLATE_KEYS_ALLOWED.join(', ')})`, code: 'INVALID_TEMPLATE_KEY' }); return; }
      }
      let tabletId: string | null = null;
      if (req.body?.tabletId != null) {
        tabletId = String(req.body.tabletId);
        const t = await dataSource.query(`SELECT id FROM store_tablets WHERE id = $1 AND organization_id = $2 LIMIT 1`, [tabletId, organizationId]);
        if (!t?.[0]) { res.status(400).json({ success: false, error: 'Tablet not found in this store', code: 'INVALID_TABLET' }); return; }
      }
      const ins = await dataSource.query(
        // WO-O4O-STORE-SCREEN-SET-ORIGIN-ISOLATION-HARDENING-V1: 매장 생성 계약 명시 — origin='store'·supplier_id=NULL.
        //   (organization_id=현재 매장, status=draft|active[UI 기본 active], supplier_id 는 매장 원본에 항상 NULL.)
        `INSERT INTO store_tablet_screen_sets (organization_id, service_key, supplier_id, tablet_id, name, origin, status, template_key, created_by_user_id)
         VALUES ($1, NULL, NULL, $2, $3, 'store', $4, $5, $6)
         RETURNING ${setCols('')}`,
        [organizationId, tabletId, name, status, templateKey, userId],
      );
      // WO-O4O-KPA-TABLET-QR-AUTO-LINK-AND-GUIDE-URL-V1 §3: Screen Set ID 생성 후 screen_set QR 자동 확보.
      res.status(201).json({ success: true, data: await withQrLink(dataSource, organizationId, ins[0].id, ins[0]) });
    } catch (error: any) {
      console.error('[StoreTablet] POST /screen-sets error:', error);
      res.status(500).json({ success: false, error: 'Failed to create screen set', code: 'INTERNAL_ERROR' });
    }
  }));

  // PATCH /screen-sets/:id — name/status/tabletId 수정
  router.patch('/screen-sets/:id', withStoreAuth(async (req, res, organizationId) => {
    try {
      const id = req.params.id;
      const owned = await dataSource.query(`SELECT id FROM store_tablet_screen_sets WHERE id = $1 AND organization_id = $2 AND origin = 'store' AND deleted_at IS NULL LIMIT 1`, [id, organizationId]);
      if (!owned?.[0]) { res.status(404).json({ success: false, error: 'Screen set not found', code: 'SCREEN_SET_NOT_FOUND' }); return; }
      const sets: string[] = [];
      const params: any[] = [];
      if (typeof req.body?.name === 'string') {
        const nm = req.body.name.trim();
        if (!nm || nm.length > 120) { res.status(400).json({ success: false, error: 'invalid name', code: 'VALIDATION_ERROR' }); return; }
        params.push(nm); sets.push(`name = $${params.length}`);
      }
      if (req.body?.status !== undefined) {
        if (!SET_STATUSES_WRITABLE.includes(req.body.status)) { res.status(400).json({ success: false, error: 'invalid status', code: 'INVALID_STATUS' }); return; }
        // WO-O4O-KPA-TABLET-CORNER-CONTENT-ASSIGNMENT-MODEL-V1 §6: 보관 시 코너 연결 보호.
        //   현재 사용 중인 코너가 있으면 보관 거부. 사용 중은 아니어도 연결이 있으면 연결 수 안내 후 거부.
        //   자동 연결 삭제는 하지 않는다(명시적 해제 유도).
        if (req.body.status === 'archived') {
          const cur = await dataSource.query(`SELECT count(*)::int AS c FROM store_tablets WHERE current_screen_set_id = $1 AND organization_id = $2`, [id, organizationId]);
          if ((cur?.[0]?.c ?? 0) > 0) { res.status(409).json({ success: false, error: '이 콘텐츠를 현재 사용 중인 코너가 있어 보관할 수 없습니다. 먼저 다른 콘텐츠로 전환해 주세요.', code: 'ARCHIVE_BLOCKED_CURRENT' }); return; }
          const links = await dataSource.query(`SELECT count(*)::int AS c FROM store_tablet_corner_contents WHERE screen_set_id = $1 AND organization_id = $2`, [id, organizationId]);
          const linkCount = links?.[0]?.c ?? 0;
          if (linkCount > 0) { res.status(409).json({ success: false, error: `이 콘텐츠가 ${linkCount}개 코너에 연결되어 있어 보관할 수 없습니다. 먼저 코너 연결을 해제해 주세요.`, code: 'ARCHIVE_BLOCKED_CONNECTED', data: { linkCount } }); return; }
        }
        params.push(req.body.status); sets.push(`status = $${params.length}`);
      }
      if (req.body?.tabletId !== undefined) {
        const tid: string | null = req.body.tabletId == null ? null : String(req.body.tabletId);
        if (tid) {
          const t = await dataSource.query(`SELECT id FROM store_tablets WHERE id = $1 AND organization_id = $2 LIMIT 1`, [tid, organizationId]);
          if (!t?.[0]) { res.status(400).json({ success: false, error: 'Tablet not found in this store', code: 'INVALID_TABLET' }); return; }
        }
        params.push(tid); sets.push(`tablet_id = $${params.length}`);
      }
      // WO-O4O-KPA-TABLET-SCREEN-SET-TEMPLATE-KEY-SCHEMA-V1: templateKey 수정(null=기본으로 초기화 허용)
      if (req.body?.templateKey !== undefined) {
        const tk: string | null = req.body.templateKey == null ? null : String(req.body.templateKey);
        if (tk !== null && !SET_TEMPLATE_KEYS_ALLOWED.includes(tk)) { res.status(400).json({ success: false, error: `invalid templateKey (allowed: ${SET_TEMPLATE_KEYS_ALLOWED.join(', ')})`, code: 'INVALID_TEMPLATE_KEY' }); return; }
        params.push(tk); sets.push(`template_key = $${params.length}`);
      }
      if (sets.length === 0) { res.status(400).json({ success: false, error: 'no fields to update', code: 'VALIDATION_ERROR' }); return; }
      sets.push(`updated_at = NOW()`);
      params.push(id); params.push(organizationId);
      // WO-O4O-SCREEN-SET-QR-LIFECYCLE-SYNC-V1: status 전이(archive/restore)와 종속 QR is_active 를 원자적으로.
      const statusChange: string | null = req.body?.status !== undefined ? String(req.body.status) : null;
      let updated: any = null;
      await dataSource.transaction(async (m) => {
        const upd = await m.query(
          `UPDATE store_tablet_screen_sets SET ${sets.join(', ')}
           WHERE id = $${params.length - 1} AND organization_id = $${params.length} AND origin = 'store' AND deleted_at IS NULL
           RETURNING ${setCols('')}`,
          params,
        );
        // WO-O4O-STORE-SCREEN-SET-ORIGIN-ISOLATION-HARDENING-V1 §4: 실제 반환 row 기준(빈 배열≠성공) → 미존재는 null → 404.
        const updRow = firstReturnedRow(upd);
        if (!updRow) return;
        updated = updRow;
        // WO-O4O-KPA-TABLET-QR-AUTO-LINK-AND-GUIDE-URL-V1 §7: 이름 변경 시 QR title 갱신 — slug 는 불변.
        if (req.body?.name !== undefined && updated.publicQrSlug) {
          await m.query(
            `UPDATE store_qr_codes SET title = $1, updated_at = NOW()
             WHERE organization_id = $2 AND landing_type = 'screen_set' AND landing_target_id = $3`,
            [String(updated.name || 'Tablet Corner').slice(0, 300), organizationId, id],
          );
        }
        // archived → QR 비활성, active/draft(=restore) → QR 재활성. slug·row 불변, 일반 QR 무영향.
        if (statusChange !== null) {
          await setScreenSetQrActive(m, organizationId, id, statusChange !== 'archived');
        }
      });
      if (!updated) { res.status(404).json({ success: false, error: 'Screen set not found', code: 'SCREEN_SET_NOT_FOUND' }); return; }
      res.json({ success: true, data: await withQrLink(dataSource, organizationId, id, updated) });
    } catch (error: any) {
      console.error('[StoreTablet] PATCH /screen-sets/:id error:', error);
      res.status(500).json({ success: false, error: 'Failed to update screen set', code: 'INTERNAL_ERROR' });
    }
  }));

  // DELETE /screen-sets/:id — soft delete(archive). 적용 중/연결 중이면 409(먼저 해제).
  //
  // WO-O4O-KPA-TABLET-FINAL-INTEGRATION-SMOKE-V1 (결함 수정):
  //   이 경로가 UI '보관' 버튼(archiveScreenSet)이 쓰는 경로인데, PATCH {status:'archived'} 와 달리
  //   **연결(store_tablet_corner_contents) 가드가 없었다**. 그래서 연결된 콘텐츠를 보관하면
  //   해당 코너 목록에서 조용히 사라지고(공개 GET 이 deleted_at IS NULL 로 JOIN) 링크 행만 남았다.
  //   실측: PATCH → 409 ARCHIVE_BLOCKED_CONNECTED / DELETE → 200 (동일 의도, 다른 결과).
  //   ASSIGNMENT-MODEL-V1 §6("현재/연결 시 보관 거부, 자동 연결 삭제 없음") 에 맞춰 두 경로를 일치시킨다.
  //   코너 연결 해제 UI 는 CORNER-CONTENT-LINK-UI-V1 에서 제공되므로 사용자에게 해제 경로가 있다.
  router.delete('/screen-sets/:id', withStoreAuth(async (req, res, organizationId) => {
    try {
      const id = req.params.id;
      const inUse = await dataSource.query(`SELECT id FROM store_tablets WHERE current_screen_set_id = $1 AND organization_id = $2 LIMIT 1`, [id, organizationId]);
      if (inUse?.[0]) { res.status(409).json({ success: false, error: '이 콘텐츠를 현재 사용 중인 코너가 있어 보관할 수 없습니다. 먼저 다른 콘텐츠로 전환해 주세요.', code: 'SCREEN_SET_IN_USE' }); return; }
      const links = await dataSource.query(`SELECT count(*)::int AS c FROM store_tablet_corner_contents WHERE screen_set_id = $1 AND organization_id = $2`, [id, organizationId]);
      const linkCount = links?.[0]?.c ?? 0;
      if (linkCount > 0) {
        res.status(409).json({
          success: false,
          error: `이 콘텐츠가 ${linkCount}개 코너에 연결되어 있어 보관할 수 없습니다. 먼저 코너 연결을 해제해 주세요.`,
          code: 'ARCHIVE_BLOCKED_CONNECTED',
          data: { linkCount },
        });
        return;
      }
      // WO-O4O-SCREEN-SET-QR-LIFECYCLE-SYNC-V1: soft-delete(=archive) + 종속 QR 비활성을 원자적으로.
      let deleted = false;
      await dataSource.transaction(async (m) => {
        const del = await m.query(
          `UPDATE store_tablet_screen_sets SET deleted_at = NOW(), status = 'archived', updated_at = NOW()
           WHERE id = $1 AND organization_id = $2 AND origin = 'store' AND deleted_at IS NULL RETURNING id`,
          [id, organizationId],
        );
        // WO-O4O-STORE-SCREEN-SET-ORIGIN-ISOLATION-HARDENING-V1 §2: 실제 삭제 row 없으면(미존재/타매장/운영자·공급자/이미제거) 404.
        if (!firstReturnedRow(del)) return;
        // Screen Set QR 만 비활성(slug·row 불변). 일반 QR·다른 set QR 무영향.
        await setScreenSetQrActive(m, organizationId, id, false);
        deleted = true;
      });
      if (!deleted) { res.status(404).json({ success: false, error: 'Screen set not found', code: 'SCREEN_SET_NOT_FOUND' }); return; }
      res.json({ success: true, data: { id, deleted: true } });
    } catch (error: any) {
      console.error('[StoreTablet] DELETE /screen-sets/:id error:', error);
      res.status(500).json({ success: false, error: 'Failed to archive screen set', code: 'INTERNAL_ERROR' });
    }
  }));

  // PUT /screen-sets/:id/blocks — 전체 교체 저장(displays PUT 패턴)
  router.put('/screen-sets/:id/blocks', withStoreAuth(async (req, res, organizationId) => {
    try {
      const id = req.params.id;
      const owned = await dataSource.query(`SELECT id FROM store_tablet_screen_sets WHERE id = $1 AND organization_id = $2 AND origin = 'store' AND deleted_at IS NULL LIMIT 1`, [id, organizationId]);
      if (!owned?.[0]) { res.status(404).json({ success: false, error: 'Screen set not found', code: 'SCREEN_SET_NOT_FOUND' }); return; }
      const blocks = req.body?.blocks;
      if (!Array.isArray(blocks)) { res.status(400).json({ success: false, error: 'blocks must be an array', code: 'VALIDATION_ERROR' }); return; }
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        if (!b || typeof b !== 'object') { res.status(400).json({ success: false, error: `blocks[${i}] must be an object`, code: 'VALIDATION_ERROR' }); return; }
        if (!SET_BLOCK_TYPES.includes(b.blockType)) { res.status(400).json({ success: false, error: `blocks[${i}].blockType invalid (allowed: ${SET_BLOCK_TYPES.join(', ')})`, code: 'INVALID_BLOCK_TYPE' }); return; }
        if (b.config != null && (typeof b.config !== 'object' || Array.isArray(b.config))) { res.status(400).json({ success: false, error: `blocks[${i}].config must be an object`, code: 'INVALID_BLOCK_CONFIG' }); return; }
        // WO-O4O-KPA-TABLET-IDLE-BLOCK-INTEGRATION-V1: idle_media config 검증(source/durationMs/custom_media)
        if (b.blockType === 'idle_media') {
          const parsed = parseIdleMediaConfig(b.config);
          if (!parsed.ok && 'error' in parsed) { res.status(400).json({ success: false, error: `blocks[${i}].config: ${parsed.error}`, code: 'INVALID_BLOCK_CONFIG' }); return; }
        }
        // WO-O4O-KPA-TABLET-CONTENT-LIST-BLOCK-SCHEMA-CONTRACT-V1: content_list config 검증(items/sourceType/키).
        if (b.blockType === 'content_list') {
          const parsed = parseContentListConfig(b.config);
          if (!parsed.ok && 'error' in parsed) { res.status(400).json({ success: false, error: `blocks[${i}].config: ${parsed.error}`, code: 'INVALID_BLOCK_CONFIG' }); return; }
        }
      }
      await dataSource.transaction(async (manager) => {
        await manager.query(`DELETE FROM store_tablet_screen_blocks WHERE screen_set_id = $1`, [id]);
        for (let i = 0; i < blocks.length; i++) {
          const b = blocks[i];
          await manager.query(
            `INSERT INTO store_tablet_screen_blocks (screen_set_id, block_type, sort_order, is_visible, config)
             VALUES ($1, $2, $3, $4, $5::jsonb)`,
            [id, b.blockType, Number.isFinite(b.sortOrder) ? b.sortOrder : i, b.isEnabled !== false, JSON.stringify(b.config ?? {})],
          );
        }
        await manager.query(`UPDATE store_tablet_screen_sets SET updated_at = NOW() WHERE id = $1`, [id]);
      });
      const updated = await dataSource.query(`SELECT ${blockCols('')} FROM store_tablet_screen_blocks WHERE screen_set_id = $1 ORDER BY sort_order ASC`, [id]);
      // WO-O4O-KPA-TABLET-QR-AUTO-LINK-AND-GUIDE-URL-V1 §3: 블록 저장(커밋) 후 screen_set QR 확보.
      //   data(blocks 배열)는 그대로 두고 publicQrSlug/publicQrUrl 를 top-level additive 로 병합(프론트 호환).
      res.json({ success: true, data: updated, ...(await withQrLink(dataSource, organizationId, id, {})) });
    } catch (error: any) {
      console.error('[StoreTablet] PUT /screen-sets/:id/blocks error:', error);
      res.status(500).json({ success: false, error: 'Failed to save blocks', code: 'INTERNAL_ERROR' });
    }
  }));

  // POST /screen-sets/preview — 저장 전 draft blocks 를 sections 로 resolve(read-only). WO-O4O-KPA-TABLET-CONTENT-DRAFT-PREVIEW-V1
  //   공개 /:slug/tablet/screen 핸들러와 동일한 resolve 로직을 body.blocks 로 복제(저장/DB write 없음).
  //   - content_list: resolveContentListItems(org 스코프) — 공개와 동일 게이트.
  //   - idle_media: custom_media 는 config 자체 items 로 완전 resolve. draft 는 tablet 미지정 → legacy/operator 소스 빈 배열.
  //   - product_list: 뷰어가 /tablet/products 로 별도 표시하므로 sections 에서 생략(상품은 fetchProducts 로 노출).
  //   - 정적 텍스트(corner_description/health_info/staff_inquiry/qr_guide): shapeStaticBlock.
  //   개별 block 실패는 해당 섹션만 생략(안전 fallback). screen_set 소유 검증 불필요(저장 안 함, org 스코프만).
  router.post('/screen-sets/preview', withStoreAuth(async (req, res, organizationId) => {
    try {
      let templateKey = resolveTemplateKey({ templateKey: req.body?.templateKey });
      if (!SET_TEMPLATE_KEYS_ALLOWED.includes(templateKey)) templateKey = 'corner_information_basic_v1';

      const rawBlocks = Array.isArray(req.body?.blocks) ? req.body.blocks : [];
      const visible = rawBlocks
        .map((b: any, i: number) => ({ b, i }))
        .filter(({ b }: any) => b && typeof b === 'object' && b.isEnabled !== false && SET_BLOCK_TYPES.includes(b.blockType))
        .sort((x: any, y: any) => {
          const sx = Number.isFinite(x.b.sortOrder) ? x.b.sortOrder : x.i;
          const sy = Number.isFinite(y.b.sortOrder) ? y.b.sortOrder : y.i;
          return sx - sy;
        });

      const sections: Array<{ blockType: string; sortOrder: number; data: Record<string, unknown> }> = [];
      let order = 0;
      // WO-O4O-SCREEN-SET-RESOLVER-CONTENT-SOURCE-SEAM-V1: content_list 원본 조회 기본 Store Adapter 명시 주입.
      const contentSource = createStoreContentSourceAdapter(dataSource);
      for (const { b } of visible) {
        const bt = b.blockType as string;
        const config = (b.config && typeof b.config === 'object' && !Array.isArray(b.config)) ? b.config : {};
        try {
          if (bt === 'content_list') {
            const items = await resolveContentListItems(contentSource, organizationId, config);
            if (items.length > 0) sections.push({ blockType: bt, sortOrder: order++, data: { items } });
          } else if (bt === 'idle_media') {
            const parsed = parseIdleMediaConfig(config);
            if (parsed.ok) {
              // draft: legacy_idle_playlist / operator_common 은 tablet 저장소 필요 → 빈 소스. custom_media 만 완전 resolve.
              const resolved = resolveIdleMediaItems(parsed.value, { legacyIdlePlaylist: [], operatorCommon: [] });
              const items = resolved.map((it) => ({ type: it.mediaType, url: it.url, ...(it.durationMs !== undefined ? { durationMs: it.durationMs } : {}) }));
              if (items.length > 0) sections.push({ blockType: bt, sortOrder: order++, data: { items } });
            }
          } else if (bt === 'product_content') {
            sections.push({ blockType: bt, sortOrder: order++, data: { productRef: config.productRef ?? null, contentId: config.contentId ?? null } });
          } else if (bt === 'product_list') {
            // 뷰어가 fetchProducts 로 상품을 별도 표시 → preview sections 에서 생략.
            continue;
          } else {
            const data = shapeStaticBlock(bt, config);
            if (data) sections.push({ blockType: bt, sortOrder: order++, data });
          }
        } catch (blockErr) {
          console.warn(`[StoreTablet] preview block resolve skipped (${bt}):`, (blockErr as any)?.message);
        }
      }

      res.json({ success: true, data: { mode: 'screen_set', templateKey, screenSet: { id: 'preview', name: '(미리보기)' }, sections, tabletId: null } });
    } catch (error: any) {
      console.error('[StoreTablet] POST /screen-sets/preview error:', error);
      res.status(500).json({ success: false, error: 'Failed to build preview', code: 'INTERNAL_ERROR' });
    }
  }));

  // ── 매장 HUB: 운영자 Screen Set 원본 열람 + 매장 독립 사본 가져오기 ──
  //   WO-O4O-OPERATOR-SCREEN-SET-HUB-PUBLISH-AND-STORE-INDEPENDENT-COPY-V1
  //
  //   경로는 top-level `/screen-set-hub/*` — 기존 `/screen-sets/:id` 의 :id 포획을 피한다.
  //   노출 조건(WO §2): origin='operator' AND status='operator_template' AND service_key=대상 서비스
  //                     AND deleted_at IS NULL. (매장·공급자 Screen Set / 타 service_key / 보관·삭제 제외.)
  //   미리보기는 별도 엔드포인트를 만들지 않는다 — 상세로 blocks 를 받아 기존
  //   POST /screen-sets/preview 로 렌더한다(= 내 매장 기준 미리보기, 기존 draft preview 재사용).
  //   운영자 원본에는 공개 URL·QR 을 발급하지 않는다(publicQrSlug 미노출).

  /** 운영자 원본 조회 공통 WHERE(재검증에도 동일 사용). */
  const OPERATOR_TEMPLATE_WHERE =
    `origin = 'operator' AND status = 'operator_template' AND service_key = $SVC AND deleted_at IS NULL`;

  // GET /screen-set-hub/templates — 목록(검색 q + 템플릿 필터 templateKey)
  router.get('/screen-set-hub/templates', withStoreAuth(async (req, res, _organizationId) => {
    try {
      const params: any[] = [OPERATOR_TEMPLATE_SERVICE_KEY];
      const where: string[] = [OPERATOR_TEMPLATE_WHERE.replace('$SVC', '$1')];
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      if (q) { params.push(`%${q}%`); where.push(`name ILIKE $${params.length}`); }
      const tk = typeof req.query.templateKey === 'string' ? req.query.templateKey : '';
      if (tk) { params.push(tk); where.push(`COALESCE(template_key, 'corner_information_basic_v1') = $${params.length}`); }
      const rows = await dataSource.query(
        `SELECT id, name, COALESCE(template_key, 'corner_information_basic_v1') AS "templateKey",
                created_at AS "createdAt", updated_at AS "updatedAt",
                (SELECT COUNT(*)::int FROM store_tablet_screen_blocks b WHERE b.screen_set_id = s.id) AS "blockCount"
         FROM store_tablet_screen_sets s
         WHERE ${where.join(' AND ')}
         ORDER BY updated_at DESC
         LIMIT 200`,
        params,
      );
      res.json({ success: true, data: rows });
    } catch (error: any) {
      console.error('[StoreTablet] GET /screen-set-hub/templates error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch operator templates', code: 'INTERNAL_ERROR' });
    }
  }));

  // GET /screen-set-hub/templates/:id — 상세 + blocks(미리보기 입력)
  router.get('/screen-set-hub/templates/:id', withStoreAuth(async (req, res, _organizationId) => {
    try {
      const rows = await dataSource.query(
        `SELECT id, name, COALESCE(template_key, 'corner_information_basic_v1') AS "templateKey",
                created_at AS "createdAt", updated_at AS "updatedAt"
         FROM store_tablet_screen_sets
         WHERE id = $2 AND ${OPERATOR_TEMPLATE_WHERE.replace('$SVC', '$1')} LIMIT 1`,
        [OPERATOR_TEMPLATE_SERVICE_KEY, req.params.id],
      );
      if (!rows?.[0]) { res.status(404).json({ success: false, error: 'Operator template not found', code: 'OPERATOR_TEMPLATE_NOT_FOUND' }); return; }
      const blocks = await dataSource.query(
        `SELECT ${blockCols('')} FROM store_tablet_screen_blocks WHERE screen_set_id = $1 ORDER BY sort_order ASC`,
        [req.params.id],
      );
      res.json({ success: true, data: { ...rows[0], blocks } });
    } catch (error: any) {
      console.error('[StoreTablet] GET /screen-set-hub/templates/:id error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch operator template', code: 'INTERNAL_ERROR' });
    }
  }));

  // POST /screen-set-hub/templates/:id/import — 매장 소유 독립 사본 생성(단일 트랜잭션)
  //   사본 계약: organization_id=매장 / origin='store' / status='active' / service_key=대상 서비스 /
  //             supplier_id=NULL / tablet_id=NULL. 새 ID 로 값 복사.
  //   원본 FK·자동 동기화·연쇄삭제 없음. 코너 자동 적용 없음(current 미지정).
  //   반복 가져오기 허용(기존 관례 WO-O4O-STORE-LIBRARY-COPY-INDEPENDENCE-ALIGN-V1: 호출마다 새 사본).
  router.post('/screen-set-hub/templates/:id/import', withStoreAuth(async (req, res, organizationId) => {
    try {
      const userId = (req as any).user?.id ?? null;
      // 1) 원본 소유권·서비스·상태 재검증(트랜잭션 밖 선검증 + 안에서 재확인)
      const srcRows = await dataSource.query(
        `SELECT id, name, template_key AS "templateKey"
         FROM store_tablet_screen_sets
         WHERE id = $2 AND ${OPERATOR_TEMPLATE_WHERE.replace('$SVC', '$1')} LIMIT 1`,
        [OPERATOR_TEMPLATE_SERVICE_KEY, req.params.id],
      );
      const src = srcRows?.[0];
      if (!src) { res.status(404).json({ success: false, error: 'Operator template not found', code: 'OPERATOR_TEMPLATE_NOT_FOUND' }); return; }

      let created: any = null;
      await dataSource.transaction(async (m) => {
        // 재검증(동시 보관·삭제 방어)
        const reSrc = await m.query(
          `SELECT id, name, template_key AS "templateKey"
           FROM store_tablet_screen_sets
           WHERE id = $2 AND ${OPERATOR_TEMPLATE_WHERE.replace('$SVC', '$1')} LIMIT 1`,
          [OPERATOR_TEMPLATE_SERVICE_KEY, req.params.id],
        );
        const s = reSrc?.[0];
        if (!s) throw Object.assign(new Error('source gone'), { code: 'OPERATOR_TEMPLATE_NOT_FOUND' });

        // 2) 매장 사본 생성(값 복사. 원본 id 를 소유권 FK 로 연결하지 않는다)
        const ins = await m.query(
          `INSERT INTO store_tablet_screen_sets
             (organization_id, service_key, supplier_id, tablet_id, name, origin, status, template_key, created_by_user_id)
           VALUES ($1, $2, NULL, NULL, $3, 'store', 'active', $4, $5)
           RETURNING ${setCols('')}`,
          [organizationId, OPERATOR_TEMPLATE_SERVICE_KEY, s.name, s.templateKey, userId],
        );
        created = ins?.[0];

        // 3) 블록 값 복사(종류·순서·표시 상태·config 전체). 새 ID 로 생성.
        await m.query(
          `INSERT INTO store_tablet_screen_blocks (screen_set_id, block_type, sort_order, is_visible, config)
           SELECT $1, block_type, sort_order, is_visible, config
             FROM store_tablet_screen_blocks
            WHERE screen_set_id = $2`,
          [created.id, s.id],
        );
      });

      // 4) provenance 기록(best-effort, 기존 store_asset_derivations 재사용 — 신규 컬럼·테이블 0, FK 없음)
      try {
        await recordDerivations(dataSource, {
          serviceKey: OPERATOR_TEMPLATE_SERVICE_KEY,
          organizationId,
          createdBy: userId,
          derivedKind: 'screen_set',
          derivedId: created.id,
          derivedTitle: created.name,
          sources: [{ kind: 'operator_screen_set', id: src.id, title: src.name }],
          metadata: { importedAt: new Date().toISOString() },
        });
      } catch (provErr: any) {
        console.warn('[StoreTablet] screen-set import provenance skipped:', provErr?.message);
      }

      // 5) 매장 사본 반환. QR 은 기존 매장 Screen Set 규칙(withQrLink lazy ensure)으로 관리.
      res.status(201).json({ success: true, data: await withQrLink(dataSource, organizationId, created.id, created) });
    } catch (error: any) {
      if (error?.code === 'OPERATOR_TEMPLATE_NOT_FOUND') {
        res.status(404).json({ success: false, error: 'Operator template not found', code: 'OPERATOR_TEMPLATE_NOT_FOUND' });
        return;
      }
      console.error('[StoreTablet] POST /screen-set-hub/templates/:id/import error:', error);
      res.status(500).json({ success: false, error: 'Failed to import operator template', code: 'INTERNAL_ERROR' });
    }
  }));

  // ── 매장 HUB: 공급자 Screen Set 원본 열람 + 매장 독립 사본 가져오기 ──
  //   WO-O4O-SUPPLIER-SCREEN-SET-BACKEND-HUB-COPY-V2B
  //   노출 조건: origin='supplier' AND status='active' AND service_key=대상 서비스 AND deleted_at IS NULL
  //             AND 현재 매장 유형(organizations.type)과 hub_target_store_type 일치 AND 의약품 약국 전용 가드 통과.
  //   매장 유형: pharmacy→약국 / store→비약국 / 그 외 유형·판별 불가 조직 → HUB 대상 제외.
  //   목록·상세·가져오기 각각에서 대상·상태·의약품 조건을 재검사(목록 필터만으로 권한 보장하지 않음).
  const SUPPLIER_HUB_SERVICE_KEY = OPERATOR_TEMPLATE_SERVICE_KEY; // 'kpa'

  // 현재 매장 유형 → HUB 매장 유형('pharmacy'|'non_pharmacy') 또는 null(대상 제외).
  async function resolveStoreHubType(orgId: string): Promise<'pharmacy' | 'non_pharmacy' | null> {
    const rows = await dataSource.query(`SELECT type FROM organizations WHERE id = $1 LIMIT 1`, [orgId]);
    const t = rows?.[0]?.type;
    if (t === 'pharmacy') return 'pharmacy';
    if (t === 'store') return 'non_pharmacy';
    return null;
  }
  // hub_target 이 이 매장 유형에 노출되는가: pharmacy 매장 ← pharmacy|all / non_pharmacy 매장 ← non_pharmacy|all
  function hubTargetVisibleTo(storeType: 'pharmacy' | 'non_pharmacy', hubTarget: string | null): boolean {
    if (!hubTarget) return false;
    if (hubTarget === 'all') return true;
    return hubTarget === storeType;
  }
  const SUPPLIER_HUB_WHERE =
    `origin = 'supplier' AND status = 'active' AND service_key = $SVC AND deleted_at IS NULL`;

  // GET /screen-set-hub/supplier-templates — 목록(대상 매장 유형 일치 + 의약품 가드)
  router.get('/screen-set-hub/supplier-templates', withStoreAuth(async (req, res, organizationId) => {
    try {
      const storeType = await resolveStoreHubType(organizationId);
      if (!storeType) { res.json({ success: true, data: [] }); return; } // 매장이 아닌 조직 → 대상 제외
      const targetIn = storeType === 'pharmacy' ? ['pharmacy', 'all'] : ['non_pharmacy', 'all'];
      const params: any[] = [SUPPLIER_HUB_SERVICE_KEY, targetIn];
      const where: string[] = [SUPPLIER_HUB_WHERE.replace('$SVC', '$1'), `hub_target_store_type = ANY($2)`];
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      if (q) { params.push(`%${q}%`); where.push(`name ILIKE $${params.length}`); }
      const sup = typeof req.query.supplierId === 'string' ? req.query.supplierId : '';
      if (sup) { params.push(sup); where.push(`supplier_id = $${params.length}`); }
      const tk = typeof req.query.templateKey === 'string' ? req.query.templateKey : '';
      if (tk) { params.push(tk); where.push(`COALESCE(template_key, 'corner_information_basic_v1') = $${params.length}`); }
      const rows = await dataSource.query(
        `SELECT s.id, s.name, s.supplier_id AS "supplierId",
                (SELECT representative_name FROM neture_suppliers ns WHERE ns.id = s.supplier_id) AS "supplierName",
                s.hub_target_store_type AS "hubTargetStoreType",
                COALESCE(s.template_key, 'corner_information_basic_v1') AS "templateKey",
                s.created_at AS "createdAt", s.updated_at AS "updatedAt",
                (SELECT COUNT(*)::int FROM store_tablet_screen_blocks b WHERE b.screen_set_id = s.id) AS "blockCount"
         FROM store_tablet_screen_sets s
         WHERE ${where.join(' AND ')}
         ORDER BY s.updated_at DESC
         LIMIT 200`,
        params,
      );
      // 비약국: 의약품/미분류 세트 제외(약국은 전부 접근 가능). 목록 단계 의약품 필터.
      let visible = rows;
      if (storeType !== 'pharmacy' && rows.length) {
        const filtered: any[] = [];
        for (const r of rows) {
          const blocks = await dataSource.query(`SELECT block_type AS "blockType", config FROM store_tablet_screen_blocks WHERE screen_set_id = $1`, [r.id]);
          const med = await analyzeScreenSetMedication(dataSource, blocks);
          if (medicationStoreAccessAllowed(med, storeType)) filtered.push(r);
        }
        visible = filtered;
      }
      res.json({ success: true, data: visible });
    } catch (error: any) {
      console.error('[StoreTablet] GET /screen-set-hub/supplier-templates error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch supplier templates', code: 'INTERNAL_ERROR' });
    }
  }));

  // GET /screen-set-hub/supplier-templates/:id — 상세 + blocks(미리보기 입력). 대상·의약품 재검사.
  router.get('/screen-set-hub/supplier-templates/:id', withStoreAuth(async (req, res, organizationId) => {
    try {
      const storeType = await resolveStoreHubType(organizationId);
      if (!storeType) { res.status(403).json({ success: false, error: 'HUB not available for this organization', code: 'STORE_TYPE_NOT_ELIGIBLE' }); return; }
      const rows = await dataSource.query(
        `SELECT id, name, hub_target_store_type AS "hubTargetStoreType",
                COALESCE(template_key, 'corner_information_basic_v1') AS "templateKey", created_at AS "createdAt", updated_at AS "updatedAt"
         FROM store_tablet_screen_sets
         WHERE id = $2 AND ${SUPPLIER_HUB_WHERE.replace('$SVC', '$1')} LIMIT 1`,
        [SUPPLIER_HUB_SERVICE_KEY, req.params.id],
      );
      const s = rows?.[0];
      if (!s || !hubTargetVisibleTo(storeType, s.hubTargetStoreType)) { res.status(404).json({ success: false, error: 'Supplier template not found', code: 'SUPPLIER_TEMPLATE_NOT_FOUND' }); return; }
      const blocks = await dataSource.query(
        `SELECT ${blockCols('')} FROM store_tablet_screen_blocks WHERE screen_set_id = $1 ORDER BY sort_order ASC`,
        [req.params.id],
      );
      // 비약국의 의약품 원본 상세 접근 거부(직접 호출 방어).
      const med = await analyzeScreenSetMedication(dataSource, blocks);
      if (!medicationStoreAccessAllowed(med, storeType)) { res.status(403).json({ success: false, error: '이 화면은 약국 매장에만 제공됩니다(의약품 포함).', code: 'MEDICATION_PHARMACY_ONLY' }); return; }
      res.json({ success: true, data: { ...s, blocks } });
    } catch (error: any) {
      console.error('[StoreTablet] GET /screen-set-hub/supplier-templates/:id error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch supplier template', code: 'INTERNAL_ERROR' });
    }
  }));

  // POST /screen-set-hub/supplier-templates/:id/import — 매장 소유 독립 사본 생성(단일 트랜잭션).
  //   사본: organization_id=매장·origin='store'·status='active'·supplier_id=NULL·hub_target=NULL·tablet_id=NULL. 새 ID 값 복사.
  //   가져오기 직전 대상·상태·의약품 재검사. 원본 FK·동기화 없음. 코너 자동 적용 없음. 반복 가져오기 허용.
  router.post('/screen-set-hub/supplier-templates/:id/import', withStoreAuth(async (req, res, organizationId) => {
    try {
      const userId = (req as any).user?.id ?? null;
      const storeType = await resolveStoreHubType(organizationId);
      if (!storeType) { res.status(403).json({ success: false, error: 'HUB not available for this organization', code: 'STORE_TYPE_NOT_ELIGIBLE' }); return; }
      const srcRows = await dataSource.query(
        `SELECT id, name, template_key AS "templateKey", hub_target_store_type AS "hubTargetStoreType"
         FROM store_tablet_screen_sets WHERE id = $2 AND ${SUPPLIER_HUB_WHERE.replace('$SVC', '$1')} LIMIT 1`,
        [SUPPLIER_HUB_SERVICE_KEY, req.params.id],
      );
      const src = srcRows?.[0];
      if (!src || !hubTargetVisibleTo(storeType, src.hubTargetStoreType)) { res.status(404).json({ success: false, error: 'Supplier template not found', code: 'SUPPLIER_TEMPLATE_NOT_FOUND' }); return; }
      // 가져오기 직전 현재 원본 내용으로 의약품 재검사(비약국 의약품 차단).
      const preBlocks = await dataSource.query(`SELECT block_type AS "blockType", config FROM store_tablet_screen_blocks WHERE screen_set_id = $1`, [src.id]);
      const med = await analyzeScreenSetMedication(dataSource, preBlocks);
      if (!medicationStoreAccessAllowed(med, storeType)) { res.status(403).json({ success: false, error: '이 화면은 약국 매장에만 제공됩니다(의약품 포함).', code: 'MEDICATION_PHARMACY_ONLY' }); return; }

      let created: any = null;
      await dataSource.transaction(async (m) => {
        const reSrc = await m.query(
          `SELECT id, name, template_key AS "templateKey", hub_target_store_type AS "hubTargetStoreType"
           FROM store_tablet_screen_sets WHERE id = $2 AND ${SUPPLIER_HUB_WHERE.replace('$SVC', '$1')} LIMIT 1`,
          [SUPPLIER_HUB_SERVICE_KEY, req.params.id],
        );
        const s = reSrc?.[0];
        if (!s || !hubTargetVisibleTo(storeType, s.hubTargetStoreType)) throw Object.assign(new Error('source gone'), { code: 'SUPPLIER_TEMPLATE_NOT_FOUND' });
        // 매장 사본: supplier_id/hub_target 미승계.
        const ins = await m.query(
          `INSERT INTO store_tablet_screen_sets
             (organization_id, service_key, supplier_id, tablet_id, name, origin, status, hub_target_store_type, template_key, created_by_user_id)
           VALUES ($1, $2, NULL, NULL, $3, 'store', 'active', NULL, $4, $5)
           RETURNING ${setCols('')}`,
          [organizationId, SUPPLIER_HUB_SERVICE_KEY, s.name, s.templateKey, userId],
        );
        created = ins?.[0];
        await m.query(
          `INSERT INTO store_tablet_screen_blocks (screen_set_id, block_type, sort_order, is_visible, config)
           SELECT $1, block_type, sort_order, is_visible, config FROM store_tablet_screen_blocks WHERE screen_set_id = $2`,
          [created.id, s.id],
        );
      });

      // provenance(best-effort) — source_kind='supplier_screen_set'.
      try {
        await recordDerivations(dataSource, {
          serviceKey: SUPPLIER_HUB_SERVICE_KEY,
          organizationId,
          createdBy: userId,
          derivedKind: 'screen_set',
          derivedId: created.id,
          derivedTitle: created.name,
          sources: [{ kind: 'supplier_screen_set', id: src.id, title: src.name }],
          metadata: { importedAt: new Date().toISOString() },
        });
      } catch (provErr: any) {
        console.warn('[StoreTablet] supplier screen-set import provenance skipped:', provErr?.message);
      }

      res.status(201).json({ success: true, data: await withQrLink(dataSource, organizationId, created.id, created) });
    } catch (error: any) {
      if (error?.code === 'SUPPLIER_TEMPLATE_NOT_FOUND') { res.status(404).json({ success: false, error: 'Supplier template not found', code: 'SUPPLIER_TEMPLATE_NOT_FOUND' }); return; }
      console.error('[StoreTablet] POST /screen-set-hub/supplier-templates/:id/import error:', error);
      res.status(500).json({ success: false, error: 'Failed to import supplier template', code: 'INTERNAL_ERROR' });
    }
  }));

  // ── content_list picker 검색 (read-only) — WO-O4O-KPA-TABLET-CONTENT-LIST-PICKER-UI-V1 ──
  //   편집기에서 content_list item(콘텐츠 카드)을 고르기 위한 검색 전용 엔드포인트.
  //   저장/복사/생성 없음. store-contents = 매장 org 스코프, o4o-descriptions = STORE canonical 공용.

  // GET /tablet-content-sources/store-contents?q= — 매장 제작 콘텐츠 검색(org 스코프)
  router.get('/tablet-content-sources/store-contents', withStoreAuth(async (req, res, organizationId) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      const params: any[] = [organizationId];
      let where = `c.organization_id = $1 AND c.workspace_status <> 'archived'`;
      if (q) { params.push(`%${q}%`); where += ` AND c.title ILIKE $${params.length}`; }
      const rows = await dataSource.query(
        `SELECT c.id AS "contentId", c.title, c.source_type AS "sourceType",
                c.workspace_status AS "workspaceStatus",
                (c.content_json->>'summary') AS summary,
                EXISTS(SELECT 1 FROM kpa_store_content_product_links l WHERE l.content_id = c.id) AS "hasProductLink"
           FROM kpa_store_contents c
          WHERE ${where}
          ORDER BY c.updated_at DESC
          LIMIT 30`,
        params,
      );
      res.json({ success: true, data: rows });
    } catch (error: any) {
      console.error('[StoreTablet] GET /tablet-content-sources/store-contents error:', error);
      res.status(500).json({ success: false, error: 'Failed to search store contents', code: 'INTERNAL_ERROR' });
    }
  }));

  // GET /tablet-content-sources/o4o-descriptions?q= — O4O 표준 설명서(STORE canonical) 검색
  //   STORE canonical 은 플랫폼 공용 소비자 표준 콘텐츠 → org 게이트 없음(설계 §10). auth 는 store owner.
  router.get('/tablet-content-sources/o4o-descriptions', withStoreAuth(async (req, res, _organizationId) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      if (q.length < 2) { res.json({ success: true, data: [] }); return; }
      const rows = await dataSource.query(
        // WO-O4O-TABLET-ADDITIONAL-CONTENT-SKU-DISTINGUISHABILITY-V1: 동일 상품명 SKU 구분용 specification 추가(직접 컬럼, migration 무관).
        `SELECT pm.id AS "masterId", pm.name, pm.barcode, pm.specification,
                (SELECT d.summary FROM shared_product_descriptions d
                  WHERE d.master_id = pm.id AND d.description_type = 'STORE' AND d.status = 'canonical' AND d.deleted_at IS NULL
                  ORDER BY (d.language = 'ko') DESC, d.updated_at DESC LIMIT 1) AS summary,
                ARRAY(SELECT DISTINCT d.language FROM shared_product_descriptions d
                       WHERE d.master_id = pm.id AND d.description_type = 'STORE' AND d.status = 'canonical' AND d.deleted_at IS NULL) AS languages
           FROM product_masters pm
          WHERE EXISTS(SELECT 1 FROM shared_product_descriptions d
                        WHERE d.master_id = pm.id AND d.description_type = 'STORE' AND d.status = 'canonical' AND d.deleted_at IS NULL)
            AND (pm.name ILIKE $1 OR pm.barcode = $2)
          ORDER BY pm.name ASC
          LIMIT 30`,
        [`%${q}%`, q],
      );
      res.json({ success: true, data: rows });
    } catch (error: any) {
      console.error('[StoreTablet] GET /tablet-content-sources/o4o-descriptions error:', error);
      res.status(500).json({ success: false, error: 'Failed to search o4o descriptions', code: 'INTERNAL_ERROR' });
    }
  }));

  // POST /tablets/:id/current-screen-set — current 적용 (public runtime 미반영 — 값만 저장)
  router.post('/tablets/:id/current-screen-set', withStoreAuth(async (req, res, organizationId) => {
    try {
      const tabletId = req.params.id;
      const screenSetId = req.body?.screenSetId;
      if (!screenSetId || typeof screenSetId !== 'string') { res.status(400).json({ success: false, error: 'screenSetId is required', code: 'VALIDATION_ERROR' }); return; }
      const t = await dataSource.query(`SELECT id FROM store_tablets WHERE id = $1 AND organization_id = $2 LIMIT 1`, [tabletId, organizationId]);
      if (!t?.[0]) { res.status(404).json({ success: false, error: 'Tablet not found', code: 'TABLET_NOT_FOUND' }); return; }
      const s = await dataSource.query(`SELECT id, status FROM store_tablet_screen_sets WHERE id = $1 AND organization_id = $2 AND origin = 'store' AND deleted_at IS NULL LIMIT 1`, [screenSetId, organizationId]);
      if (!s?.[0]) { res.status(404).json({ success: false, error: 'Screen set not found', code: 'SCREEN_SET_NOT_FOUND' }); return; }
      if (s[0].status !== 'active') { res.status(409).json({ success: false, error: 'Screen set must be active to apply', code: 'SCREEN_SET_NOT_ACTIVE' }); return; }
      // WO-O4O-KPA-TABLET-CORNER-CONTENT-ASSIGNMENT-MODEL-V1 §2:
      //   적용 = 연결 보장 + current 변경(원자적). 연결이 없으면 생성한다(current ∈ 연결 목록 불변식).
      //   legacy tablet_id 전용 제약은 다중 코너 재사용과 충돌하므로 연결 기반으로 대체.
      await dataSource.transaction(async (manager) => {
        await manager.query(
          `INSERT INTO store_tablet_corner_contents (organization_id, tablet_id, screen_set_id, sort_order, is_visible)
           VALUES ($1, $2, $3, COALESCE((SELECT MAX(sort_order) + 10 FROM store_tablet_corner_contents WHERE tablet_id = $2), 0), TRUE)
           ON CONFLICT (tablet_id, screen_set_id) DO NOTHING`,
          [organizationId, tabletId, screenSetId],
        );
        await manager.query(`UPDATE store_tablets SET current_screen_set_id = $1 WHERE id = $2 AND organization_id = $3`, [screenSetId, tabletId, organizationId]);
      });
      res.json({ success: true, data: { tabletId, currentScreenSetId: screenSetId } });
    } catch (error: any) {
      console.error('[StoreTablet] POST /tablets/:id/current-screen-set error:', error);
      res.status(500).json({ success: false, error: 'Failed to apply screen set', code: 'INTERNAL_ERROR' });
    }
  }));

  // DELETE /tablets/:id/current-screen-set — current 해제(→ legacy)
  router.delete('/tablets/:id/current-screen-set', withStoreAuth(async (req, res, organizationId) => {
    try {
      const tabletId = req.params.id;
      const t = await dataSource.query(`SELECT id FROM store_tablets WHERE id = $1 AND organization_id = $2 LIMIT 1`, [tabletId, organizationId]);
      if (!t?.[0]) { res.status(404).json({ success: false, error: 'Tablet not found', code: 'TABLET_NOT_FOUND' }); return; }
      await dataSource.query(`UPDATE store_tablets SET current_screen_set_id = NULL WHERE id = $1 AND organization_id = $2`, [tabletId, organizationId]);
      res.json({ success: true, data: { tabletId, currentScreenSetId: null } });
    } catch (error: any) {
      console.error('[StoreTablet] DELETE /tablets/:id/current-screen-set error:', error);
      res.status(500).json({ success: false, error: 'Failed to clear screen set', code: 'INTERNAL_ERROR' });
    }
  }));

  // ─────────────────────────────────────────────────────────────
  // WO-O4O-KPA-TABLET-CORNER-CONTENT-ASSIGNMENT-MODEL-V1: 코너×콘텐츠 연결(store_tablet_corner_contents)
  //   연결 = 선택 가능 콘텐츠 목록. current_screen_set_id = 현재 표시 콘텐츠(∈ 연결).
  // ─────────────────────────────────────────────────────────────

  // GET /tablets/:id/screen-sets — 코너에 연결된 콘텐츠 목록(+isCurrent, set 메타)
  router.get('/tablets/:id/screen-sets', withStoreAuth(async (req, res, organizationId) => {
    try {
      const tabletId = req.params.id;
      const t = await dataSource.query(`SELECT id, current_screen_set_id AS "currentScreenSetId" FROM store_tablets WHERE id = $1 AND organization_id = $2 LIMIT 1`, [tabletId, organizationId]);
      if (!t?.[0]) { res.status(404).json({ success: false, error: 'Tablet not found', code: 'TABLET_NOT_FOUND' }); return; }
      const currentId: string | null = t[0].currentScreenSetId ?? null;
      const rows = await dataSource.query(
        `SELECT cc.screen_set_id AS "screenSetId", cc.sort_order AS "sortOrder", cc.is_visible AS "isVisible",
                s.name, s.status, COALESCE(s.template_key, 'corner_information_basic_v1') AS "templateKey",
                s.public_qr_slug AS "publicQrSlug",
                (SELECT count(*)::int FROM store_tablet_screen_blocks b WHERE b.screen_set_id = s.id) AS "blockCount"
           FROM store_tablet_corner_contents cc
           JOIN store_tablet_screen_sets s ON s.id = cc.screen_set_id AND s.origin = 'store' AND s.deleted_at IS NULL
          WHERE cc.tablet_id = $1 AND cc.organization_id = $2
          ORDER BY cc.sort_order ASC, s.updated_at DESC`,
        [tabletId, organizationId],
      );
      const data = rows.map((r: any) => ({ ...r, isCurrent: r.screenSetId === currentId }));
      res.json({ success: true, data, currentScreenSetId: currentId });
    } catch (error: any) {
      console.error('[StoreTablet] GET /tablets/:id/screen-sets error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch corner contents', code: 'INTERNAL_ERROR' });
    }
  }));

  // POST /tablets/:id/screen-sets/:screenSetId — 코너에 콘텐츠 연결 추가(원본 복사 없음)
  router.post('/tablets/:id/screen-sets/:screenSetId', withStoreAuth(async (req, res, organizationId) => {
    try {
      const tabletId = req.params.id;
      const screenSetId = req.params.screenSetId;
      const t = await dataSource.query(`SELECT id FROM store_tablets WHERE id = $1 AND organization_id = $2 LIMIT 1`, [tabletId, organizationId]);
      if (!t?.[0]) { res.status(404).json({ success: false, error: 'Tablet not found', code: 'TABLET_NOT_FOUND' }); return; }
      const s = await dataSource.query(`SELECT id, status FROM store_tablet_screen_sets WHERE id = $1 AND organization_id = $2 AND origin = 'store' AND deleted_at IS NULL LIMIT 1`, [screenSetId, organizationId]);
      if (!s?.[0]) { res.status(404).json({ success: false, error: 'Screen set not found', code: 'SCREEN_SET_NOT_FOUND' }); return; }
      if (s[0].status === 'archived') { res.status(409).json({ success: false, error: 'Archived screen set cannot be linked', code: 'SCREEN_SET_ARCHIVED' }); return; }
      // 중복은 UNIQUE(tablet, set) 로 방지 — 이미 있으면 그대로 성공(멱등).
      await dataSource.query(
        `INSERT INTO store_tablet_corner_contents (organization_id, tablet_id, screen_set_id, sort_order, is_visible)
         VALUES ($1, $2, $3, COALESCE((SELECT MAX(sort_order) + 10 FROM store_tablet_corner_contents WHERE tablet_id = $2), 0), TRUE)
         ON CONFLICT (tablet_id, screen_set_id) DO NOTHING`,
        [organizationId, tabletId, screenSetId],
      );
      res.status(201).json({ success: true, data: { tabletId, screenSetId } });
    } catch (error: any) {
      console.error('[StoreTablet] POST /tablets/:id/screen-sets/:screenSetId error:', error);
      res.status(500).json({ success: false, error: 'Failed to link screen set', code: 'INTERNAL_ERROR' });
    }
  }));

  // DELETE /tablets/:id/screen-sets/:screenSetId — 코너에서 콘텐츠 연결 해제(원본/타 코너/QR 무변경)
  //   현재 사용 중 콘텐츠는 자동 전환하지 않고 409 반환(명시적 전환 유도).
  router.delete('/tablets/:id/screen-sets/:screenSetId', withStoreAuth(async (req, res, organizationId) => {
    try {
      const tabletId = req.params.id;
      const screenSetId = req.params.screenSetId;
      const t = await dataSource.query(`SELECT id, current_screen_set_id AS "currentScreenSetId" FROM store_tablets WHERE id = $1 AND organization_id = $2 LIMIT 1`, [tabletId, organizationId]);
      if (!t?.[0]) { res.status(404).json({ success: false, error: 'Tablet not found', code: 'TABLET_NOT_FOUND' }); return; }
      if (t[0].currentScreenSetId === screenSetId) {
        res.status(409).json({ success: false, error: '현재 사용 중인 콘텐츠입니다. 먼저 다른 콘텐츠로 전환하거나 적용을 해제해 주세요.', code: 'CURRENT_CONTENT_CANNOT_BE_REMOVED' });
        return;
      }
      const del = await dataSource.query(
        `DELETE FROM store_tablet_corner_contents WHERE tablet_id = $1 AND screen_set_id = $2 AND organization_id = $3 RETURNING id`,
        [tabletId, screenSetId, organizationId],
      );
      if (!del?.[0]) { res.status(404).json({ success: false, error: 'Link not found', code: 'CORNER_CONTENT_NOT_FOUND' }); return; }
      res.json({ success: true, data: { tabletId, screenSetId, removed: true } });
    } catch (error: any) {
      console.error('[StoreTablet] DELETE /tablets/:id/screen-sets/:screenSetId error:', error);
      res.status(500).json({ success: false, error: 'Failed to unlink screen set', code: 'INTERNAL_ERROR' });
    }
  }));

  // PATCH /tablets/:id/screen-sets/order — 연결 콘텐츠 정렬(body.order = screenSetId 배열)
  router.patch('/tablets/:id/screen-sets/order', withStoreAuth(async (req, res, organizationId) => {
    try {
      const tabletId = req.params.id;
      const order = Array.isArray(req.body?.order) ? req.body.order.filter((x: unknown): x is string => typeof x === 'string') : null;
      if (!order || order.length === 0) { res.status(400).json({ success: false, error: 'order (screenSetId array) is required', code: 'VALIDATION_ERROR' }); return; }
      const t = await dataSource.query(`SELECT id FROM store_tablets WHERE id = $1 AND organization_id = $2 LIMIT 1`, [tabletId, organizationId]);
      if (!t?.[0]) { res.status(404).json({ success: false, error: 'Tablet not found', code: 'TABLET_NOT_FOUND' }); return; }
      await dataSource.transaction(async (manager) => {
        for (let i = 0; i < order.length; i++) {
          await manager.query(
            `UPDATE store_tablet_corner_contents SET sort_order = $1, updated_at = NOW()
             WHERE tablet_id = $2 AND screen_set_id = $3 AND organization_id = $4`,
            [i * 10, tabletId, order[i], organizationId],
          );
        }
      });
      res.json({ success: true, data: { tabletId, order } });
    } catch (error: any) {
      console.error('[StoreTablet] PATCH /tablets/:id/screen-sets/order error:', error);
      res.status(500).json({ success: false, error: 'Failed to reorder corner contents', code: 'INTERNAL_ERROR' });
    }
  }));

  return router;
}

// ─────────────────────────────────────────────────────
// Interest Request Transition Helper
// ─────────────────────────────────────────────────────

async function handleInterestTransition(
  dataSource: DataSource,
  req: Request,
  res: Response,
  organizationId: string,
  targetStatus: InterestRequestStatus,
  transitions: Record<string, InterestRequestStatus[]>,
): Promise<void> {
  try {
    const { id } = req.params;
    const interestRepo = dataSource.getRepository(TabletInterestRequest);

    const request = await interestRepo.findOne({
      where: { id, organizationId },
    });
    if (!request) {
      res.status(404).json({
        success: false,
        error: 'Interest request not found',
        code: 'NOT_FOUND',
      });
      return;
    }

    const allowed = transitions[request.status] || [];
    if (!allowed.includes(targetStatus)) {
      res.status(400).json({
        success: false,
        error: `Cannot transition from '${request.status}' to '${targetStatus}'`,
        code: 'INVALID_TRANSITION',
      });
      return;
    }

    request.status = targetStatus;
    const now = new Date();
    if (targetStatus === InterestRequestStatus.ACKNOWLEDGED) request.acknowledgedAt = now;
    if (targetStatus === InterestRequestStatus.COMPLETED) request.completedAt = now;
    if (targetStatus === InterestRequestStatus.CANCELLED) request.cancelledAt = now;

    const saved = await interestRepo.save(request);

    res.json({
      success: true,
      data: {
        id: saved.id,
        status: saved.status,
        updatedAt: saved.updatedAt,
      },
    });
  } catch (error: any) {
    console.error(`[StoreTablet] PATCH /interest/:id transition error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to update interest request',
      code: 'INTERNAL_ERROR',
    });
  }
}
