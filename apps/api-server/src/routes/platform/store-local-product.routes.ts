/**
 * Store Local Product Routes — CRUD for Display Domain
 *
 * WO-STORE-LOCAL-PRODUCT-DISPLAY-V1
 * WO-STORE-LOCAL-PRODUCT-CONTENT-REFINEMENT-V1
 *
 * StoreLocalProduct는 Commerce Object가 아니다.
 * Checkout/EcommerceOrder와 완전 분리된 Display Domain.
 *
 * API Namespace: /api/v1/store/local-products
 *
 * ┌──────────────────────────────────────────────────────┐
 * │ AUTHENTICATED (requireAuth + pharmacy owner)         │
 * │  GET    /local-products       — 목록 조회            │
 * │  POST   /local-products       — 생성                │
 * │  PUT    /local-products/:id   — 수정                │
 * │  DELETE /local-products/:id   — 비활성화             │
 * └──────────────────────────────────────────────────────┘
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';

type AuthMiddleware = RequestHandler;
import { StoreLocalProduct } from './entities/store-local-product.entity.js';
import type { AuthRequest } from '../../types/auth.js';
import { resolveStoreAccess } from '../../utils/store-owner.utils.js';

// ─────────────────────────────────────────────────────
// Content Helpers
// ─────────────────────────────────────────────────────

const VALID_BADGE_TYPES = ['none', 'new', 'recommend', 'event'] as const;

/** Strip <script> tags and inline event handlers from HTML */
function sanitizeHtml(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

// ─────────────────────────────────────────────────────
// Controller
// ─────────────────────────────────────────────────────

export function createStoreLocalProductRoutes(
  dataSource: DataSource,
): Router {
  const router = Router();

  // Lazy-load requireAuth to avoid circular import
  let requireAuth: AuthMiddleware;
  async function getAuth(): Promise<AuthMiddleware> {
    if (!requireAuth) {
      const mod = await import('../../middleware/auth.middleware.js');
      requireAuth = mod.requireAuth as AuthMiddleware;
    }
    return requireAuth;
  }

  /**
   * GET /local-products
   * 매장 자체 상품 목록 조회 (페이징, 카테고리 필터)
   */
  router.get('/local-products', async (req: Request, res: Response): Promise<void> => {
    try {
      const auth = await getAuth();
      await new Promise<void>((resolve, reject) => {
        (auth as any)(req, res, (err: any) => (err ? reject(err) : resolve()));
      });

      // WO-ROLE-NORMALIZATION-PHASE3-A-V1: organization_members 기반
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        res.status(403).json({ success: false, error: 'Store owner or operator role required', code: 'FORBIDDEN' });
        return;
      }
      const userRoles: string[] = authReq.user?.roles || [];
      const organizationId = await resolveStoreAccess(dataSource, userId, userRoles);
      if (!organizationId) {
        res.json({ success: true, data: { items: [], total: 0 } });
        return;
      }

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;
      const category = req.query.category as string | undefined;
      const activeOnly = req.query.activeOnly !== 'false';
      const highlightOnly = req.query.highlightOnly === 'true';

      let whereClause = `WHERE organization_id = $1`;
      const params: any[] = [organizationId];
      let paramIdx = 2;

      if (activeOnly) {
        whereClause += ` AND is_active = true`;
      }

      if (category) {
        whereClause += ` AND category = $${paramIdx}`;
        params.push(category);
        paramIdx++;
      }

      if (highlightOnly) {
        whereClause += ` AND highlight_flag = true`;
      }

      const [items, countResult] = await Promise.all([
        dataSource.query(
          `SELECT id, name, description, summary, images, thumbnail_url, gallery_images,
                  category, price_display, badge_type, highlight_flag,
                  is_active, sort_order, created_at, updated_at
           FROM store_local_products
           ${whereClause}
           ORDER BY sort_order ASC, created_at DESC
           LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
          [...params, limit, offset],
        ),
        dataSource.query(
          `SELECT COUNT(*)::int as count FROM store_local_products ${whereClause}`,
          params,
        ),
      ]);

      res.json({
        success: true,
        data: {
          items,
          total: countResult[0]?.count || 0,
          page,
          limit,
        },
      });
    } catch (error: any) {
      console.error('[StoreLocalProduct] GET /local-products error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch local products',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  /**
   * POST /local-products
   * 매장 자체 상품 생성
   */
  router.post('/local-products', async (req: Request, res: Response): Promise<void> => {
    try {
      const auth = await getAuth();
      await new Promise<void>((resolve, reject) => {
        (auth as any)(req, res, (err: any) => (err ? reject(err) : resolve()));
      });

      // WO-ROLE-NORMALIZATION-PHASE3-A-V1: organization_members 기반
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        res.status(403).json({ success: false, error: 'Store owner or operator role required', code: 'FORBIDDEN' });
        return;
      }
      const userRoles: string[] = authReq.user?.roles || [];
      const organizationId = await resolveStoreAccess(dataSource, userId, userRoles);
      if (!organizationId) {
        res.status(403).json({ success: false, error: 'Store owner or operator role required', code: 'FORBIDDEN' });
        return;
      }

      const {
        name, description, images, category, priceDisplay, sortOrder,
        summary, detailHtml, usageInfo, cautionInfo,
        thumbnailUrl, galleryImages, badgeType, highlightFlag,
      } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Product name is required',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      if (badgeType && !VALID_BADGE_TYPES.includes(badgeType)) {
        res.status(400).json({
          success: false,
          error: `Invalid badge_type: ${badgeType}. Must be one of: ${VALID_BADGE_TYPES.join(', ')}`,
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const repo = dataSource.getRepository(StoreLocalProduct);
      const product = repo.create({
        organizationId,
        name: name.trim(),
        description: description || null,
        images: Array.isArray(images) ? images : [],
        category: category || null,
        priceDisplay: priceDisplay != null ? String(priceDisplay) : null,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
        isActive: true,
        summary: summary || null,
        detailHtml: detailHtml ? sanitizeHtml(String(detailHtml)) : null,
        usageInfo: usageInfo || null,
        cautionInfo: cautionInfo || null,
        thumbnailUrl: thumbnailUrl || null,
        galleryImages: Array.isArray(galleryImages) ? galleryImages : [],
        badgeType: badgeType || 'none',
        highlightFlag: Boolean(highlightFlag),
      });

      const saved = await repo.save(product);
      res.status(201).json({ success: true, data: saved });
    } catch (error: any) {
      console.error('[StoreLocalProduct] POST /local-products error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create local product',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  /**
   * PUT /local-products/:id
   * 매장 자체 상품 수정
   */
  router.put('/local-products/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const auth = await getAuth();
      await new Promise<void>((resolve, reject) => {
        (auth as any)(req, res, (err: any) => (err ? reject(err) : resolve()));
      });

      // WO-ROLE-NORMALIZATION-PHASE3-A-V1: organization_members 기반
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        res.status(403).json({ success: false, error: 'Store owner or operator role required', code: 'FORBIDDEN' });
        return;
      }
      const userRoles: string[] = authReq.user?.roles || [];
      const organizationId = await resolveStoreAccess(dataSource, userId, userRoles);
      if (!organizationId) {
        res.status(403).json({ success: false, error: 'Store owner or operator role required', code: 'FORBIDDEN' });
        return;
      }

      const productId = req.params.id;
      const repo = dataSource.getRepository(StoreLocalProduct);
      const existing = await repo.findOne({
        where: { id: productId, organizationId },
      });

      if (!existing) {
        res.status(404).json({
          success: false,
          error: 'Product not found',
          code: 'NOT_FOUND',
        });
        return;
      }

      const {
        name, description, images, category, priceDisplay, sortOrder, isActive,
        summary, detailHtml, usageInfo, cautionInfo,
        thumbnailUrl, galleryImages, badgeType, highlightFlag,
      } = req.body;

      if (badgeType !== undefined && !VALID_BADGE_TYPES.includes(badgeType)) {
        res.status(400).json({
          success: false,
          error: `Invalid badge_type: ${badgeType}. Must be one of: ${VALID_BADGE_TYPES.join(', ')}`,
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      if (name !== undefined) existing.name = String(name).trim();
      if (description !== undefined) existing.description = description;
      if (images !== undefined) existing.images = Array.isArray(images) ? images : existing.images;
      if (category !== undefined) existing.category = category;
      if (priceDisplay !== undefined) existing.priceDisplay = priceDisplay != null ? String(priceDisplay) : null;
      if (sortOrder !== undefined) existing.sortOrder = Number(sortOrder);
      if (isActive !== undefined) existing.isActive = Boolean(isActive);
      if (summary !== undefined) existing.summary = summary || null;
      if (detailHtml !== undefined) existing.detailHtml = detailHtml ? sanitizeHtml(String(detailHtml)) : null;
      if (usageInfo !== undefined) existing.usageInfo = usageInfo || null;
      if (cautionInfo !== undefined) existing.cautionInfo = cautionInfo || null;
      if (thumbnailUrl !== undefined) existing.thumbnailUrl = thumbnailUrl || null;
      if (galleryImages !== undefined) existing.galleryImages = Array.isArray(galleryImages) ? galleryImages : existing.galleryImages;
      if (badgeType !== undefined) existing.badgeType = badgeType;
      if (highlightFlag !== undefined) existing.highlightFlag = Boolean(highlightFlag);

      const saved = await repo.save(existing);
      res.json({ success: true, data: saved });
    } catch (error: any) {
      console.error('[StoreLocalProduct] PUT /local-products/:id error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update local product',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  /**
   * DELETE /local-products/:id
   * 매장 자체 상품 비활성화 (soft delete)
   */
  router.delete('/local-products/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const auth = await getAuth();
      await new Promise<void>((resolve, reject) => {
        (auth as any)(req, res, (err: any) => (err ? reject(err) : resolve()));
      });

      // WO-ROLE-NORMALIZATION-PHASE3-A-V1: organization_members 기반
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        res.status(403).json({ success: false, error: 'Store owner or operator role required', code: 'FORBIDDEN' });
        return;
      }
      const userRoles: string[] = authReq.user?.roles || [];
      const organizationId = await resolveStoreAccess(dataSource, userId, userRoles);
      if (!organizationId) {
        res.status(403).json({ success: false, error: 'Store owner or operator role required', code: 'FORBIDDEN' });
        return;
      }

      const productId = req.params.id;
      const result = await dataSource.query(
        `UPDATE store_local_products SET is_active = false, updated_at = now()
         WHERE id = $1 AND organization_id = $2`,
        [productId, organizationId],
      );

      if (result[1] === 0) {
        res.status(404).json({
          success: false,
          error: 'Product not found',
          code: 'NOT_FOUND',
        });
        return;
      }

      res.json({ success: true, data: { id: productId, isActive: false } });
    } catch (error: any) {
      console.error('[StoreLocalProduct] DELETE /local-products/:id error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to deactivate local product',
        code: 'INTERNAL_ERROR',
      });
    }
  });

  return router;
}
