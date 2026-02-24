/**
 * Store Tablet Routes — Tablet Device & Display Management
 *
 * WO-STORE-LOCAL-PRODUCT-DISPLAY-V1
 *
 * Tablet은 상품을 "소유"하지 않는다. 상품을 "선택하여 진열"한다.
 * 상품 풀: supplier (organization_product_listings) + local (store_local_products)
 *
 * API Namespace: /api/v1/store/tablets
 *
 * ┌──────────────────────────────────────────────────────┐
 * │ AUTHENTICATED (requireAuth + pharmacy owner)         │
 * │  GET    /tablets                 — 태블릿 목록       │
 * │  POST   /tablets                 — 태블릿 등록       │
 * │  PUT    /tablets/:id             — 태블릿 수정       │
 * │  DELETE /tablets/:id             — 태블릿 비활성화    │
 * │  GET    /tablets/:id/displays    — 진열 구성 조회    │
 * │  PUT    /tablets/:id/displays    — 진열 구성 저장    │
 * │  GET    /tablets/:id/product-pool — 상품 풀 조회     │
 * └──────────────────────────────────────────────────────┘
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { KpaMember } from '../kpa/entities/kpa-member.entity.js';
import { StoreTablet } from './entities/store-tablet.entity.js';
import { StoreTabletDisplay } from './entities/store-tablet-display.entity.js';
import type { AuthRequest } from '../../types/auth.js';
import { hasAnyServiceRole } from '../../utils/role.utils.js';

type AuthMiddleware = import('express').RequestHandler;

// ─────────────────────────────────────────────────────
// Helpers (shared with store-local-product.routes.ts)
// ─────────────────────────────────────────────────────

async function getUserOrganizationId(
  dataSource: DataSource,
  userId: string,
): Promise<string | null> {
  const memberRepo = dataSource.getRepository(KpaMember);
  const member = await memberRepo.findOne({ where: { user_id: userId } });
  return member?.organization_id || null;
}

function isStoreOwnerRole(roles: string[], user?: any): boolean {
  if (user?.pharmacistRole === 'pharmacy_owner') return true;
  return hasAnyServiceRole(roles, [
    'kpa:branch_admin',
    'kpa:branch_operator',
    'kpa:admin',
    'kpa:operator',
  ]);
}

/**
 * Authenticates request and extracts organizationId.
 * Returns null if auth fails (response already sent).
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
  const userRoles = authReq.user?.roles || [];

  if (!userId || !isStoreOwnerRole(userRoles, authReq.user)) {
    res.status(403).json({
      success: false,
      error: 'Store owner or operator role required',
      code: 'FORBIDDEN',
    });
    return null;
  }

  const organizationId = await getUserOrganizationId(dataSource, userId);
  if (!organizationId) {
    res.status(400).json({
      success: false,
      error: 'User not associated with an organization',
      code: 'NO_ORGANIZATION',
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
          `SELECT id, external_product_id, product_name, retail_price, is_active,
                  display_order, product_metadata, service_key
           FROM organization_product_listings
           WHERE organization_id = $1 AND is_active = true
           ORDER BY display_order ASC, product_name ASC`,
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

  return router;
}
