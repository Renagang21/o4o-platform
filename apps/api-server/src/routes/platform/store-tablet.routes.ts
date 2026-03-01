/**
 * Store Tablet Routes — Tablet Device & Display Management + Interest Requests
 *
 * WO-STORE-LOCAL-PRODUCT-DISPLAY-V1
 * WO-O4O-TABLET-MODULE-V1
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
import { StoreProductProfile } from '../../modules/neture/entities/StoreProductProfile.entity.js';
import { validateGtin } from '../../utils/gtin.js';
import type { AuthRequest } from '../../types/auth.js';
import { resolveStoreAccess } from '../../utils/store-owner.utils.js';

type AuthMiddleware = import('express').RequestHandler;

// ─────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────

/**
 * Authenticates request and extracts organizationId.
 * Returns null if auth fails (response already sent).
 *
 * WO-ROLE-NORMALIZATION-PHASE3-A-V1: organization_members 기반
 */
async function authenticateAndGetOrg(
  dataSource: DataSource,
  req: Request,
  res: Response,
  authMiddleware: AuthMiddleware,
): Promise<string | null> {
  try {
    await new Promise<void>((resolve, reject) => {
      (authMiddleware as any)(req, res, (err: any) => (err ? reject(err) : resolve()));
    });
  } catch {
    return null;
  }

  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;
  if (!userId) {
    res.status(403).json({
      success: false,
      error: 'Store owner or operator role required',
      code: 'FORBIDDEN',
    });
    return null;
  }

  const userRoles: string[] = authReq.user?.roles || [];
  const organizationId = await resolveStoreAccess(dataSource, userId, userRoles);
  if (!organizationId) {
    res.status(403).json({
      success: false,
      error: 'Store owner or operator role required',
      code: 'FORBIDDEN',
    });
    return null;
  }

  return organizationId;
}

// ─────────────────────────────────────────────────────
// Display Guard — 상품 존재 검증
// ─────────────────────────────────────────────────────

interface DisplayItem {
  productType: 'supplier' | 'local';
  productId: string;
  sortOrder: number;
  isVisible: boolean;
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

  let requireAuth: AuthMiddleware;
  async function getAuth(): Promise<AuthMiddleware> {
    if (!requireAuth) {
      const mod = await import('../../middleware/auth.middleware.js');
      requireAuth = mod.requireAuth as AuthMiddleware;
    }
    return requireAuth;
  }

  // ─── Tablet CRUD ───────────────────────────────────

  /**
   * GET /tablets
   * 매장 태블릿 목록
   */
  router.get('/tablets', async (req: Request, res: Response): Promise<void> => {
    try {
      const auth = await getAuth();
      const organizationId = await authenticateAndGetOrg(dataSource, req, res, auth);
      if (!organizationId) return;

      const tablets = await dataSource.query(
        `SELECT id, name, location, is_active, created_at
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
  });

  /**
   * POST /tablets
   * 태블릿 등록
   */
  router.post('/tablets', async (req: Request, res: Response): Promise<void> => {
    try {
      const auth = await getAuth();
      const organizationId = await authenticateAndGetOrg(dataSource, req, res, auth);
      if (!organizationId) return;

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
  });

  /**
   * PUT /tablets/:id
   * 태블릿 수정
   */
  router.put('/tablets/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const auth = await getAuth();
      const organizationId = await authenticateAndGetOrg(dataSource, req, res, auth);
      if (!organizationId) return;

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
  });

  /**
   * DELETE /tablets/:id
   * 태블릿 비활성화 (soft delete)
   */
  router.delete('/tablets/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const auth = await getAuth();
      const organizationId = await authenticateAndGetOrg(dataSource, req, res, auth);
      if (!organizationId) return;

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
  });

  // ─── Display Management ────────────────────────────

  /**
   * GET /tablets/:id/displays
   * 태블릿 진열 구성 조회
   */
  router.get('/tablets/:id/displays', async (req: Request, res: Response): Promise<void> => {
    try {
      const auth = await getAuth();
      const organizationId = await authenticateAndGetOrg(dataSource, req, res, auth);
      if (!organizationId) return;

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
        `SELECT id, product_type, product_id, sort_order, is_visible, created_at
         FROM store_tablet_displays
         WHERE tablet_id = $1
         ORDER BY sort_order ASC`,
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
  });

  /**
   * PUT /tablets/:id/displays
   * 태블릿 진열 구성 저장 (전체 교체)
   *
   * Body: { displays: [{ productType, productId, sortOrder, isVisible }] }
   *
   * Phase 3 Guard: 각 상품의 존재 + 소유권 검증
   */
  router.put('/tablets/:id/displays', async (req: Request, res: Response): Promise<void> => {
    try {
      const auth = await getAuth();
      const organizationId = await authenticateAndGetOrg(dataSource, req, res, auth);
      if (!organizationId) return;

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
            `INSERT INTO store_tablet_displays (tablet_id, product_type, product_id, sort_order, is_visible)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              tabletId,
              item.productType,
              item.productId,
              item.sortOrder ?? i,
              item.isVisible !== false,
            ],
          );
        }
      });

      // Return updated displays
      const updated = await dataSource.query(
        `SELECT id, product_type, product_id, sort_order, is_visible, created_at
         FROM store_tablet_displays
         WHERE tablet_id = $1
         ORDER BY sort_order ASC`,
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
  });

  // ─── Product Pool ──────────────────────────────────

  /**
   * GET /tablets/:id/product-pool
   * 태블릿에 진열 가능한 상품 풀 조회
   *
   * 반환: { supplierProducts: [...], localProducts: [...] }
   */
  router.get('/tablets/:id/product-pool', async (req: Request, res: Response): Promise<void> => {
    try {
      const auth = await getAuth();
      const organizationId = await authenticateAndGetOrg(dataSource, req, res, auth);
      if (!organizationId) return;

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
          `SELECT opl.id, opl.offer_id, pm.marketing_name AS product_name, spo.price_general AS retail_price,
                  opl.is_active, opl.created_at, opl.service_key
           FROM organization_product_listings opl
           LEFT JOIN supplier_product_offers spo ON spo.id = opl.offer_id
           LEFT JOIN product_masters pm ON pm.id = spo.master_id
           WHERE opl.organization_id = $1 AND opl.is_active = true
           ORDER BY opl.created_at ASC, pm.marketing_name ASC`,
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
  });

  // ─── Barcode Product Registration (WO-O4O-TABLET-MODULE-V1) ──

  /**
   * POST /products/register-by-barcode
   * 바코드 스캔 → Master 조회 → StoreProductProfile upsert
   *
   * Body: { barcode: string }
   */
  router.post('/products/register-by-barcode', async (req: Request, res: Response): Promise<void> => {
    try {
      const auth = await getAuth();
      const organizationId = await authenticateAndGetOrg(dataSource, req, res, auth);
      if (!organizationId) return;

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
          displayName: master.marketingName,
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
          marketingName: master.marketingName,
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
  });

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
  router.get('/interest/pending-count', async (req: Request, res: Response): Promise<void> => {
    try {
      const auth = await getAuth();
      const organizationId = await authenticateAndGetOrg(dataSource, req, res, auth);
      if (!organizationId) return;

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
  });

  /**
   * GET /interest/recent
   * 최근 관심 요청 목록 (REQUESTED + ACKNOWLEDGED, 최신 50건)
   */
  router.get('/interest/recent', async (req: Request, res: Response): Promise<void> => {
    try {
      const auth = await getAuth();
      const organizationId = await authenticateAndGetOrg(dataSource, req, res, auth);
      if (!organizationId) return;

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
  });

  /**
   * GET /interest/stats
   * 대시보드용 관심 요청 통계
   */
  router.get('/interest/stats', async (req: Request, res: Response): Promise<void> => {
    try {
      const auth = await getAuth();
      const organizationId = await authenticateAndGetOrg(dataSource, req, res, auth);
      if (!organizationId) return;

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
  });

  /**
   * PATCH /interest/:id/acknowledge
   * 관심 요청 확인 처리
   */
  router.patch('/interest/:id/acknowledge', async (req: Request, res: Response): Promise<void> => {
    await handleInterestTransition(dataSource, req, res, getAuth, InterestRequestStatus.ACKNOWLEDGED, INTEREST_TRANSITIONS);
  });

  /**
   * PATCH /interest/:id/complete
   * 관심 요청 완료 처리
   */
  router.patch('/interest/:id/complete', async (req: Request, res: Response): Promise<void> => {
    await handleInterestTransition(dataSource, req, res, getAuth, InterestRequestStatus.COMPLETED, INTEREST_TRANSITIONS);
  });

  /**
   * PATCH /interest/:id/cancel
   * 관심 요청 취소 처리
   */
  router.patch('/interest/:id/cancel', async (req: Request, res: Response): Promise<void> => {
    await handleInterestTransition(dataSource, req, res, getAuth, InterestRequestStatus.CANCELLED, INTEREST_TRANSITIONS);
  });

  return router;
}

// ─────────────────────────────────────────────────────
// Interest Request Transition Helper
// ─────────────────────────────────────────────────────

async function handleInterestTransition(
  dataSource: DataSource,
  req: Request,
  res: Response,
  getAuth: () => Promise<import('express').RequestHandler>,
  targetStatus: InterestRequestStatus,
  transitions: Record<string, InterestRequestStatus[]>,
): Promise<void> {
  try {
    const auth = await getAuth();
    const organizationId = await authenticateAndGetOrg(dataSource, req, res, auth);
    if (!organizationId) return;

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
