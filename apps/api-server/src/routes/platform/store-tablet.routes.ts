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
import { parseIdleMediaConfig } from './store-tablet-idle-block.js';
// WO-O4O-KPA-TABLET-CONTENT-LIST-BLOCK-SCHEMA-CONTRACT-V1: content_list config 검증
import { parseContentListConfig } from './store-tablet-content-list-block.js';

type AuthMiddleware = import('express').RequestHandler;

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
  // WO-O4O-KPA-TABLET-SCREEN-SET-TEMPLATE-KEY-SCHEMA-V1 / -TEMPLATE-APPLY-V1:
  //   저장 허용 template_key = corner_information_basic_v1(기본) + product_focus(+ null=기본).
  //   product_focus 는 kiosk-core 렌더러 분기 구현됨(-TEMPLATE-APPLY-V1).
  //   idle_video_first / comparison 은 아직 예약값(렌더러 없음) → 저장 차단(후속 WO 에서 확장).
  const SET_TEMPLATE_KEYS_ALLOWED = ['corner_information_basic_v1', 'product_focus'];
  const setCols = (p: string) =>
    `${p}id, ${p}organization_id AS "organizationId", ${p}service_key AS "serviceKey", ` +
    `${p}tablet_id AS "tabletId", ${p}name, ${p}origin, ${p}status, ` +
    `COALESCE(${p}template_key, 'corner_information_basic_v1') AS "templateKey", ` +
    `${p}created_by_user_id AS "createdByUserId", ${p}created_at AS "createdAt", ${p}updated_at AS "updatedAt"`;
  const blockCols = (p: string) =>
    `${p}id, ${p}screen_set_id AS "screenSetId", ${p}block_type AS "blockType", ${p}sort_order AS "sortOrder", ` +
    `${p}is_visible AS "isEnabled", ${p}config, ${p}created_at AS "createdAt", ${p}updated_at AS "updatedAt"`;

  // GET /screen-sets — 목록 (org 스코프). filter: tabletId / status / includeArchived
  router.get('/screen-sets', withStoreAuth(async (req, res, organizationId) => {
    try {
      const where: string[] = ['s.organization_id = $1', 's.deleted_at IS NULL'];
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
         WHERE s.id = $1 AND s.organization_id = $2 AND s.deleted_at IS NULL LIMIT 1`,
        [req.params.id, organizationId],
      );
      if (!rows?.[0]) { res.status(404).json({ success: false, error: 'Screen set not found', code: 'SCREEN_SET_NOT_FOUND' }); return; }
      const blocks = await dataSource.query(
        `SELECT ${blockCols('')} FROM store_tablet_screen_blocks WHERE screen_set_id = $1 ORDER BY sort_order ASC`,
        [req.params.id],
      );
      res.json({ success: true, data: { ...rows[0], blocks } });
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
        `INSERT INTO store_tablet_screen_sets (organization_id, service_key, tablet_id, name, origin, status, template_key, created_by_user_id)
         VALUES ($1, NULL, $2, $3, 'store', $4, $5, $6)
         RETURNING ${setCols('')}`,
        [organizationId, tabletId, name, status, templateKey, userId],
      );
      res.status(201).json({ success: true, data: ins[0] });
    } catch (error: any) {
      console.error('[StoreTablet] POST /screen-sets error:', error);
      res.status(500).json({ success: false, error: 'Failed to create screen set', code: 'INTERNAL_ERROR' });
    }
  }));

  // PATCH /screen-sets/:id — name/status/tabletId 수정
  router.patch('/screen-sets/:id', withStoreAuth(async (req, res, organizationId) => {
    try {
      const id = req.params.id;
      const owned = await dataSource.query(`SELECT id FROM store_tablet_screen_sets WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL LIMIT 1`, [id, organizationId]);
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
      const upd = await dataSource.query(
        `UPDATE store_tablet_screen_sets SET ${sets.join(', ')}
         WHERE id = $${params.length - 1} AND organization_id = $${params.length} AND deleted_at IS NULL
         RETURNING ${setCols('')}`,
        params,
      );
      res.json({ success: true, data: upd[0] });
    } catch (error: any) {
      console.error('[StoreTablet] PATCH /screen-sets/:id error:', error);
      res.status(500).json({ success: false, error: 'Failed to update screen set', code: 'INTERNAL_ERROR' });
    }
  }));

  // DELETE /screen-sets/:id — soft delete(archive). 적용 중이면 409(먼저 해제).
  router.delete('/screen-sets/:id', withStoreAuth(async (req, res, organizationId) => {
    try {
      const id = req.params.id;
      const inUse = await dataSource.query(`SELECT id FROM store_tablets WHERE current_screen_set_id = $1 AND organization_id = $2 LIMIT 1`, [id, organizationId]);
      if (inUse?.[0]) { res.status(409).json({ success: false, error: 'Screen set is currently applied to a tablet. Unassign it first.', code: 'SCREEN_SET_IN_USE' }); return; }
      const del = await dataSource.query(
        `UPDATE store_tablet_screen_sets SET deleted_at = NOW(), status = 'archived', updated_at = NOW()
         WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL RETURNING id`,
        [id, organizationId],
      );
      if (!del?.[0]) { res.status(404).json({ success: false, error: 'Screen set not found', code: 'SCREEN_SET_NOT_FOUND' }); return; }
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
      const owned = await dataSource.query(`SELECT id FROM store_tablet_screen_sets WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL LIMIT 1`, [id, organizationId]);
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
      res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('[StoreTablet] PUT /screen-sets/:id/blocks error:', error);
      res.status(500).json({ success: false, error: 'Failed to save blocks', code: 'INTERNAL_ERROR' });
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
      const s = await dataSource.query(`SELECT id, tablet_id AS "tabletId", status FROM store_tablet_screen_sets WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL LIMIT 1`, [screenSetId, organizationId]);
      if (!s?.[0]) { res.status(404).json({ success: false, error: 'Screen set not found', code: 'SCREEN_SET_NOT_FOUND' }); return; }
      if (s[0].status !== 'active') { res.status(409).json({ success: false, error: 'Screen set must be active to apply', code: 'SCREEN_SET_NOT_ACTIVE' }); return; }
      if (s[0].tabletId && s[0].tabletId !== tabletId) { res.status(409).json({ success: false, error: 'Screen set is dedicated to another tablet', code: 'SCREEN_SET_NOT_APPLICABLE' }); return; }
      await dataSource.query(`UPDATE store_tablets SET current_screen_set_id = $1 WHERE id = $2 AND organization_id = $3`, [screenSetId, tabletId, organizationId]);
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
