/**
 * ProductLibraryController — WO-O4O-GLOBAL-PRODUCT-LIBRARY-SEARCH-V1
 *
 * 공급자용 상품 라이브러리 검색 API (인증된 사용자 전용)
 * - GET /products/library/search  — 텍스트/필터 검색
 * - GET /products/library/:id     — 상세 조회
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { NetureService } from '../neture.service.js';
import logger from '../../../utils/logger.js';

export function createProductLibraryController(dataSource: DataSource): Router {
  const router = Router();
  const netureService = new NetureService();

  /**
   * GET /products/library/search
   * 텍스트(이름/바코드/제조사) + 카테고리/브랜드 필터 + 페이지네이션
   */
  router.get('/products/library/search', requireAuth, async (req: Request, res: Response) => {
    try {
      const { q, categoryId, brandId, page, limit } = req.query;

      const result = await netureService.searchProductMasters({
        q: typeof q === 'string' ? q : undefined,
        categoryId: typeof categoryId === 'string' ? categoryId : undefined,
        brandId: typeof brandId === 'string' ? brandId : undefined,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });

      // Attach primary images
      const masterIds = result.data.map((m) => m.id);
      let imageMap = new Map<string, string>();
      if (masterIds.length > 0) {
        const images: Array<{ master_id: string; image_url: string }> = await dataSource.query(
          `SELECT master_id, image_url FROM product_images
           WHERE master_id = ANY($1) AND is_primary = true`,
          [masterIds],
        );
        imageMap = new Map(images.map((i) => [i.master_id, i.image_url]));
      }

      const pageNum = page ? Number(page) : 1;
      const limitNum = limit ? Math.min(Number(limit), 50) : 20;

      const data = result.data.map((m) => ({
        id: m.id,
        barcode: m.barcode,
        marketingName: m.marketingName,
        regulatoryName: m.regulatoryName,
        manufacturerName: m.manufacturerName,
        specification: m.specification || null,
        category: m.category ? { id: m.category.id, name: m.category.name } : null,
        brand: m.brand ? { id: m.brand.id, name: m.brand.name } : null,
        primaryImageUrl: imageMap.get(m.id) || null,
      }));

      res.json({
        success: true,
        data,
        meta: {
          page: pageNum,
          limit: limitNum,
          total: result.total,
          totalPages: Math.ceil(result.total / limitNum),
        },
      });
    } catch (error) {
      logger.error('[ProductLibrary] Error searching products:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to search products' });
    }
  });

  /**
   * GET /products/library/:id
   * Master 상세 조회 (with category, brand)
   */
  router.get('/products/library/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const master = await netureService.getProductMasterById(id);
      if (!master) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'ProductMaster not found' });
      }

      // Fetch all images for this master
      const images: Array<{ id: string; image_url: string; is_primary: boolean; sort_order: number; type: string }> =
        await dataSource.query(
          `SELECT id, image_url, is_primary, sort_order, type FROM product_images
           WHERE master_id = $1 ORDER BY sort_order ASC`,
          [id],
        );

      res.json({
        success: true,
        data: {
          id: master.id,
          barcode: master.barcode,
          regulatoryType: master.regulatoryType,
          regulatoryName: master.regulatoryName,
          marketingName: master.marketingName,
          manufacturerName: master.manufacturerName,
          brandName: master.brandName,
          specification: master.specification,
          originCountry: master.originCountry,
          tags: master.tags,
          isMfdsVerified: master.isMfdsVerified,
          category: master.category ? { id: master.category.id, name: master.category.name } : null,
          brand: master.brand ? { id: master.brand.id, name: master.brand.name } : null,
          images: images.map((img) => ({
            id: img.id,
            imageUrl: img.image_url,
            isPrimary: img.is_primary,
            sortOrder: img.sort_order,
            type: img.type || 'detail',
          })),
          createdAt: master.createdAt,
        },
      });
    } catch (error) {
      logger.error('[ProductLibrary] Error fetching product detail:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch product detail' });
    }
  });

  return router;
}
