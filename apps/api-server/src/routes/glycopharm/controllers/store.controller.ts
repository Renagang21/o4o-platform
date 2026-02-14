/**
 * Store Controller - Public StoreFront API
 *
 * WO-O4O-STOREFRONT-ACTIVATION-V1
 *
 * Public (인증 불필요):
 * - GET /stores/:slug           — 매장 정보
 * - GET /stores/:slug/categories — 상품 카테고리
 * - GET /stores/:slug/products   — 상품 목록 (pagination)
 * - GET /stores/:slug/products/featured — 추천 상품
 * - GET /stores/:slug/products/:id — 상품 상세
 * - GET /stores/:slug/storefront-config — 스토어 설정 조회
 * - GET /stores/:slug/hero       — Hero 콘텐츠 조회
 *
 * Authenticated (인증 필요):
 * - PUT /stores/:slug/storefront-config — 스토어 설정 저장
 * - PUT /stores/:slug/hero       — Hero 콘텐츠 저장
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { GlycopharmService } from '../services/glycopharm.service.js';
import { FeaturedProductsService } from '../services/featured-products.service.js';
import { GlycopharmProduct } from '../entities/glycopharm-product.entity.js';
import { GlycopharmPharmacy } from '../entities/glycopharm-pharmacy.entity.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import type { ListProductsQueryDto } from '../dto/index.js';

export function createStoreController(dataSource: DataSource): Router {
  const router = Router();
  const service = new GlycopharmService(dataSource);
  const featuredService = new FeaturedProductsService(dataSource);
  const productRepo = dataSource.getRepository(GlycopharmProduct);
  const pharmacyRepo = dataSource.getRepository(GlycopharmPharmacy);

  // ============================================================================
  // GET /stores/:slug — 매장 정보 (public)
  // ============================================================================
  router.get('/:slug', async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const pharmacy = await service.getActivePharmacyBySlug(slug);

      if (!pharmacy) {
        res.status(404).json({
          success: false,
          error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
        });
        return;
      }

      res.json({ success: true, data: pharmacy });
    } catch (error: any) {
      console.error('[StoreController] GET /:slug error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch store' },
      });
    }
  });

  // ============================================================================
  // GET /stores/:slug/categories — 상품 카테고리 (public)
  // ============================================================================
  router.get('/:slug/categories', async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const pharmacy = await service.getPharmacyEntityBySlug(slug);

      if (!pharmacy) {
        res.status(404).json({
          success: false,
          error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
        });
        return;
      }

      // Get distinct categories from active products for this pharmacy
      const categories = await productRepo
        .createQueryBuilder('p')
        .select('p.category', 'category')
        .addSelect('COUNT(*)::int', 'productCount')
        .where('p.pharmacy_id = :pharmacyId', { pharmacyId: pharmacy.id })
        .andWhere('p.status = :status', { status: 'active' })
        .groupBy('p.category')
        .orderBy('"productCount"', 'DESC')
        .getRawMany();

      const data = categories.map((c: any, idx: number) => ({
        id: c.category,
        name: c.category,
        slug: c.category,
        productCount: c.productCount,
        order: idx,
      }));

      res.json({ success: true, data });
    } catch (error: any) {
      console.error('[StoreController] GET /:slug/categories error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch categories' },
      });
    }
  });

  // ============================================================================
  // GET /stores/:slug/products/featured — 추천 상품 (public)
  // NOTE: This route MUST come before /:slug/products/:id
  // ============================================================================
  router.get('/:slug/products/featured', async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const limit = req.query.limit ? Number(req.query.limit) : 8;
      const pharmacy = await service.getPharmacyEntityBySlug(slug);

      if (!pharmacy) {
        res.status(404).json({
          success: false,
          error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
        });
        return;
      }

      // Try curated featured products first
      const featured = await featuredService.listFeaturedProducts('glycopharm', pharmacy.id);
      if (featured.length > 0) {
        const data = featured
          .filter((f) => f.is_active && f.product)
          .slice(0, limit)
          .map((f) => ({
            id: f.product!.id,
            productId: f.product!.id,
            name: f.product!.name,
            price: Number(f.product!.price),
            salePrice: f.product!.sale_price ? Number(f.product!.sale_price) : undefined,
            thumbnailUrl: f.product!.images?.[0]?.url,
            isFeatured: true,
          }));
        res.json({ success: true, data });
        return;
      }

      // Fallback: products marked is_featured
      const products = await productRepo.find({
        where: { pharmacy_id: pharmacy.id, status: 'active', is_featured: true },
        order: { sort_order: 'ASC', created_at: 'DESC' },
        take: limit,
      });

      const data = products.map((p) => ({
        id: p.id,
        productId: p.id,
        name: p.name,
        price: Number(p.price),
        salePrice: p.sale_price ? Number(p.sale_price) : undefined,
        thumbnailUrl: p.images?.[0]?.url,
        isFeatured: true,
      }));

      res.json({ success: true, data });
    } catch (error: any) {
      console.error('[StoreController] GET /:slug/products/featured error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch featured products' },
      });
    }
  });

  // ============================================================================
  // GET /stores/:slug/products — 상품 목록 (public, pagination)
  // ============================================================================
  router.get('/:slug/products', async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const pharmacy = await service.getPharmacyEntityBySlug(slug);

      if (!pharmacy) {
        res.status(404).json({
          success: false,
          error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
        });
        return;
      }

      const queryDto: ListProductsQueryDto = {
        pharmacy_id: pharmacy.id,
        status: 'active',
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
        category: req.query.category as any,
        sort: (req.query.sort as any) || 'created_at',
        order: (req.query.order as any) || 'desc',
        q: req.query.q as string,
      };

      const result = await service.listProducts(queryDto);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error('[StoreController] GET /:slug/products error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch products' },
      });
    }
  });

  // ============================================================================
  // GET /stores/:slug/products/:id — 상품 상세 (public)
  // ============================================================================
  router.get('/:slug/products/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug, id } = req.params;
      const pharmacy = await service.getPharmacyEntityBySlug(slug);

      if (!pharmacy) {
        res.status(404).json({
          success: false,
          error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
        });
        return;
      }

      const product = await service.getProductById(id);

      if (!product || product.pharmacy_id !== pharmacy.id) {
        res.status(404).json({
          success: false,
          error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found in this store' },
        });
        return;
      }

      res.json({ success: true, data: product });
    } catch (error: any) {
      console.error('[StoreController] GET /:slug/products/:id error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch product' },
      });
    }
  });

  // ============================================================================
  // GET /stores/:slug/storefront-config — 스토어 설정 조회 (public)
  // ============================================================================
  router.get('/:slug/storefront-config', async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const pharmacy = await pharmacyRepo.findOne({ where: { slug } });

      if (!pharmacy) {
        res.status(404).json({
          success: false,
          error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
        });
        return;
      }

      res.json({ success: true, data: pharmacy.storefront_config || {} });
    } catch (error: any) {
      console.error('[StoreController] GET /:slug/storefront-config error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch storefront config' },
      });
    }
  });

  // ============================================================================
  // PUT /stores/:slug/storefront-config — 스토어 설정 저장 (authenticated)
  // ============================================================================
  router.put('/:slug/storefront-config', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const pharmacy = await pharmacyRepo.findOne({ where: { slug } });

      if (!pharmacy) {
        res.status(404).json({
          success: false,
          error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
        });
        return;
      }

      const { theme, template } = req.body;

      // Runtime validation (WO-STOREFRONT-STABILIZATION Phase 1)
      const VALID_THEMES = ['neutral', 'clean', 'modern', 'professional'];
      const VALID_TEMPLATES = ['franchise-standard'];

      if (theme !== undefined && !VALID_THEMES.includes(theme)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_THEME', message: `Invalid theme. Must be one of: ${VALID_THEMES.join(', ')}` },
        });
        return;
      }

      if (template !== undefined && !VALID_TEMPLATES.includes(template)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_TEMPLATE', message: `Invalid template. Must be one of: ${VALID_TEMPLATES.join(', ')}` },
        });
        return;
      }

      const currentConfig = pharmacy.storefront_config || {};
      const updatedConfig = {
        ...currentConfig,
        ...(theme !== undefined && { theme }),
        ...(template !== undefined && { template }),
      };

      await pharmacyRepo.update(pharmacy.id, { storefront_config: updatedConfig });

      res.json({ success: true, data: updatedConfig });
    } catch (error: any) {
      console.error('[StoreController] PUT /:slug/storefront-config error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update storefront config' },
      });
    }
  });

  // ============================================================================
  // GET /stores/:slug/hero — Hero 콘텐츠 조회 (public)
  // ============================================================================
  router.get('/:slug/hero', async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const pharmacy = await pharmacyRepo.findOne({ where: { slug } });

      if (!pharmacy) {
        res.status(404).json({
          success: false,
          error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
        });
        return;
      }

      const heroContents = pharmacy.storefront_config?.heroContents || [];
      res.json({ success: true, data: heroContents });
    } catch (error: any) {
      console.error('[StoreController] GET /:slug/hero error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch hero contents' },
      });
    }
  });

  // ============================================================================
  // PUT /stores/:slug/hero — Hero 콘텐츠 저장 (authenticated)
  // ============================================================================
  router.put('/:slug/hero', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const pharmacy = await pharmacyRepo.findOne({ where: { slug } });

      if (!pharmacy) {
        res.status(404).json({
          success: false,
          error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
        });
        return;
      }

      const { heroContents } = req.body;
      if (!Array.isArray(heroContents)) {
        res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'heroContents must be an array' },
        });
        return;
      }

      // Per-item validation (WO-STOREFRONT-STABILIZATION Phase 1)
      const VALID_HERO_SOURCES = ['operator', 'pharmacy', 'default'];
      for (const item of heroContents) {
        if (!item.id || typeof item.id !== 'string') {
          res.status(400).json({
            success: false,
            error: { code: 'INVALID_HERO_CONTENT', message: 'Each hero content must have a string id' },
          });
          return;
        }
        if (!item.title || typeof item.title !== 'string') {
          res.status(400).json({
            success: false,
            error: { code: 'INVALID_HERO_CONTENT', message: 'Each hero content must have a string title' },
          });
          return;
        }
        if (item.source && !VALID_HERO_SOURCES.includes(item.source)) {
          res.status(400).json({
            success: false,
            error: { code: 'INVALID_HERO_SOURCE', message: `Hero source must be one of: ${VALID_HERO_SOURCES.join(', ')}` },
          });
          return;
        }
      }

      const currentConfig = pharmacy.storefront_config || {};
      const updatedConfig = { ...currentConfig, heroContents };

      await pharmacyRepo.update(pharmacy.id, { storefront_config: updatedConfig });

      res.json({ success: true, data: heroContents });
    } catch (error: any) {
      console.error('[StoreController] PUT /:slug/hero error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update hero contents' },
      });
    }
  });

  return router;
}
