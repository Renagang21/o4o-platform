import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { ProductAiContentService } from '../services/product-ai-content.service.js';
import type { ProductContentInput } from '../services/product-ai-content.service.js';
import type { ProductAiContentType } from '../entities/product-ai-content.entity.js';
import { authenticate } from '../../../middleware/auth.middleware.js';

/**
 * Product AI Content Controller — IR-O4O-AI-CONTENT-ENGINE-IMPLEMENTATION-V1
 *
 * POST /:productId/ai-contents/generate          — 전체 content_type AI 콘텐츠 일괄 생성
 * POST /:productId/ai-contents/generate/:type     — 특정 content_type AI 콘텐츠 생성
 * GET  /:productId/ai-contents                    — 상품 AI 콘텐츠 전체 조회
 * GET  /:productId/ai-contents/:type              — 특정 content_type 조회
 * DELETE /:productId/ai-contents/:contentId       — AI 콘텐츠 삭제
 */

const VALID_CONTENT_TYPES: ProductAiContentType[] = [
  'product_description',
  'pop_short',
  'pop_long',
  'qr_description',
  'signage_text',
];

export function createProductAiContentRouter(dataSource: DataSource): Router {
  const router = Router();
  const contentService = new ProductAiContentService(dataSource);

  // POST /:productId/ai-contents/generate — 전체 콘텐츠 일괄 생성 (fire-and-forget)
  router.post('/:productId/ai-contents/generate', authenticate, async (req, res) => {
    try {
      const { productId } = req.params;

      const product = await loadProductContentInput(dataSource, productId);
      if (!product) {
        res.status(404).json({ success: false, error: 'Product not found' });
        return;
      }

      // Fire-and-forget
      contentService.generateAllContents(product).catch(() => {});

      res.json({ success: true, message: 'Content generation started for all types' });
    } catch (error) {
      console.error('[ProductAiContent] generate all error:', error);
      res.status(500).json({ success: false, error: 'Failed to start content generation' });
    }
  });

  // POST /:productId/ai-contents/generate/:type — 특정 타입 콘텐츠 생성
  router.post('/:productId/ai-contents/generate/:type', authenticate, async (req, res) => {
    try {
      const { productId, type } = req.params;

      if (!VALID_CONTENT_TYPES.includes(type as ProductAiContentType)) {
        res.status(400).json({
          success: false,
          error: `Invalid content type. Valid types: ${VALID_CONTENT_TYPES.join(', ')}`,
        });
        return;
      }

      const product = await loadProductContentInput(dataSource, productId);
      if (!product) {
        res.status(404).json({ success: false, error: 'Product not found' });
        return;
      }

      // Fire-and-forget
      contentService.generateContent(product, type as ProductAiContentType).catch(() => {});

      res.json({ success: true, message: `Content generation started for type: ${type}` });
    } catch (error) {
      console.error('[ProductAiContent] generate type error:', error);
      res.status(500).json({ success: false, error: 'Failed to start content generation' });
    }
  });

  // GET /:productId/ai-contents — 전체 조회
  router.get('/:productId/ai-contents', authenticate, async (req, res) => {
    try {
      const { productId } = req.params;
      const contents = await contentService.getContentsByProduct(productId);
      res.json({ success: true, data: contents });
    } catch (error) {
      console.error('[ProductAiContent] get all error:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve AI contents' });
    }
  });

  // GET /:productId/ai-contents/:type — 특정 타입 조회
  router.get('/:productId/ai-contents/:type', authenticate, async (req, res) => {
    try {
      const { productId, type } = req.params;

      if (!VALID_CONTENT_TYPES.includes(type as ProductAiContentType)) {
        res.status(400).json({
          success: false,
          error: `Invalid content type. Valid types: ${VALID_CONTENT_TYPES.join(', ')}`,
        });
        return;
      }

      const content = await contentService.getContent(productId, type as ProductAiContentType);
      if (!content) {
        res.status(404).json({ success: false, error: 'Content not found' });
        return;
      }
      res.json({ success: true, data: content });
    } catch (error) {
      console.error('[ProductAiContent] get type error:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve AI content' });
    }
  });

  // DELETE /:productId/ai-contents/:contentId — 삭제
  router.delete('/:productId/ai-contents/:contentId', authenticate, async (req, res) => {
    try {
      const { productId, contentId } = req.params;
      await contentService.deleteContent(contentId, productId);
      res.json({ success: true, message: 'Content deleted' });
    } catch (error) {
      console.error('[ProductAiContent] delete error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete AI content' });
    }
  });

  return router;
}

/**
 * ProductMaster + Category + Brand + Tags 정보를 콘텐츠 생성용으로 조회.
 */
async function loadProductContentInput(
  dataSource: DataSource,
  productId: string,
): Promise<ProductContentInput | null> {
  try {
    const rows = await dataSource.query(
      `SELECT
         pm.id,
         pm.regulatory_name AS "regulatoryName",
         pm.name AS "marketingName",
         pm.specification,
         pm.manufacturer_name AS "manufacturerName",
         pm.tags,
         pc.name AS "categoryName",
         b.name AS "brandName"
       FROM product_masters pm
       LEFT JOIN product_categories pc ON pc.id = pm.category_id
       LEFT JOIN brands b ON b.id = pm.brand_id
       WHERE pm.id = $1`,
      [productId],
    );

    if (rows.length === 0) return null;

    const r = rows[0];

    // OCR 텍스트 조회 (있으면 포함)
    let ocrText: string | null = null;
    try {
      const ocrRows = await dataSource.query(
        `SELECT ocr_text FROM product_ocr_texts WHERE product_id = $1 ORDER BY created_at ASC`,
        [productId],
      );
      const combined = ocrRows
        .filter((o: any) => o.ocr_text && o.ocr_text.trim().length > 0)
        .map((o: any) => o.ocr_text.trim())
        .join('\n');
      if (combined.length > 0) ocrText = combined;
    } catch {
      // OCR table may not exist yet — graceful skip
    }

    return {
      id: r.id,
      regulatoryName: r.regulatoryName,
      marketingName: r.marketingName,
      specification: r.specification,
      categoryName: r.categoryName,
      brandName: r.brandName,
      manufacturerName: r.manufacturerName,
      tags: Array.isArray(r.tags) ? r.tags : [],
      ocrText,
    };
  } catch {
    return null;
  }
}
