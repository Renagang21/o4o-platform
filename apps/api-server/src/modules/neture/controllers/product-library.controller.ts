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
import { BulkMatchService } from '../services/bulk-match.service.js';
import { AliasService, AliasSource } from '../services/alias.service.js';
import { uploadSingleMiddleware } from '../../../middleware/upload.middleware.js';
import { parseXlsxToRecords } from '../services/xlsx-parser.service.js';
import logger from '../../../utils/logger.js';

export function createProductLibraryController(dataSource: DataSource): Router {
  const router = Router();
  const netureService = new NetureService();
  const bulkMatchService = new BulkMatchService(dataSource);
  const aliasService = new AliasService(dataSource);

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
        name: m.name,
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

      // WO-O4O-DRUG-CANONICAL-DESCRIPTION-OUTPUT-LINK-V1:
      //   canonical 공식 설명(status='canonical') 연결. is_canonical 컬럼은 없음 → status 기준.
      //   방어적: 2건 이상이면 최신 1건만 반환 + warning (partial-unique 상 정상은 1건).
      const canonRows: Array<{
        id: string; source_type: string; source_ref_id: string | null; content: string;
        summary: string | null; status: string; curated_at: string | null; updated_at: string;
      }> = await dataSource.query(
        `SELECT id, source_type, source_ref_id, content, summary, status, curated_at, updated_at
           FROM shared_product_descriptions
          WHERE master_id = $1 AND status='canonical' AND deleted_at IS NULL
          ORDER BY updated_at DESC LIMIT 2`,
        [id],
      );
      if (canonRows.length > 1) {
        logger.warn(`[ProductLibrary] master ${id} has multiple canonical descriptions; returning latest`);
      }
      const canonicalDescription = canonRows[0]
        ? {
            id: canonRows[0].id,
            sourceType: canonRows[0].source_type,
            sourceRefId: canonRows[0].source_ref_id,
            content: canonRows[0].content,
            summary: canonRows[0].summary,
            status: canonRows[0].status,
            isCanonical: true,
            curatedAt: canonRows[0].curated_at,
            updatedAt: canonRows[0].updated_at,
          }
        : null;

      res.json({
        success: true,
        data: {
          id: master.id,
          barcode: master.barcode,
          regulatoryType: master.regulatoryType,
          regulatoryName: master.regulatoryName,
          name: master.name,
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
          canonicalDescription,
          createdAt: master.createdAt,
        },
      });
    } catch (error) {
      logger.error('[ProductLibrary] Error fetching product detail:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch product detail' });
    }
  });

  /**
   * POST /products/bulk-match
   *
   * WO-O4O-BULK-MATCHING-NORMALIZATION-V1
   *
   * 이름 목록(JSON) 또는 XLSX 파일을 받아 ProductMaster 매칭 결과를 반환한다.
   * 배치 레코드 생성 없음 — 순수 preview 전용.
   *
   * Body (JSON): { names: string[] }
   * OR multipart file upload (XLSX/CSV): name 컬럼에서 추출
   *
   * Response: { success: true, data: MatchResult[], total: number }
   */
  router.post(
    '/products/bulk-match',
    requireAuth,
    uploadSingleMiddleware('file'),
    async (req: Request, res: Response) => {
      try {
        let names: string[];

        const uploadedFile = (req as any).file as Express.Multer.File | undefined;
        if (uploadedFile) {
          // File upload path: parse XLSX/CSV → extract name column
          const records: Array<Record<string, string>> = parseXlsxToRecords(uploadedFile.buffer);
          names = records
            .map((r) => (r['name'] || r['marketing_name'] || r['packaging_name'] || '').trim())
            .filter(Boolean);
        } else {
          // JSON path
          const body = req.body as { names?: unknown };
          if (!Array.isArray(body.names)) {
            return res.status(400).json({ success: false, error: 'INVALID_INPUT', message: 'names array required' });
          }
          names = (body.names as unknown[])
            .map((n) => String(n ?? '').trim())
            .filter(Boolean);
        }

        if (names.length === 0) {
          return res.status(400).json({ success: false, error: 'NO_NAMES', message: 'No names provided' });
        }
        if (names.length > 200) {
          return res.status(400).json({ success: false, error: 'TOO_MANY', message: 'Maximum 200 names per request' });
        }

        const data = await bulkMatchService.matchNames(names);
        const summary = {
          total: data.length,
          exactMatch: data.filter((r) => r.status === 'EXACT_MATCH').length,
          similarMatch: data.filter((r) => r.status === 'SIMILAR_MATCH').length,
          notFound: data.filter((r) => r.status === 'NOT_FOUND').length,
        };

        res.json({ success: true, data, summary });
      } catch (error) {
        logger.error('[ProductLibrary] Error in bulk-match:', error);
        res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Bulk match failed' });
      }
    },
  );

  /**
   * POST /products/library/select
   *
   * WO-O4O-PRODUCT-ALIAS-FOUNDATION-V1
   *
   * 사용자가 검색 결과에서 ProductMaster를 선택할 때 호출.
   * 검색어가 상품명과 다르면 alias로 저장하여 향후 검색 품질을 향상시킨다.
   *
   * Body: { masterId: string, searchTerm: string }
   */
  router.post('/products/library/select', requireAuth, async (req: Request, res: Response) => {
    try {
      const { masterId, searchTerm } = req.body as { masterId?: string; searchTerm?: string };
      if (!masterId || !searchTerm) {
        return res.status(400).json({ success: false, error: 'INVALID_INPUT' });
      }
      // best-effort — 실패해도 사용자 흐름에 영향 없음
      aliasService.upsertAlias(masterId, searchTerm, AliasSource.SEARCH).catch(() => {});
      res.json({ success: true });
    } catch (error) {
      logger.error('[ProductLibrary] Error recording select:', error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
    }
  });

  return router;
}
